const mockGetServerSession = jest.fn(
  async (...args: unknown[]): Promise<unknown> => {
    void args;
    return null;
  },
);
const mockTaskFindFirst = jest.fn(async (query: unknown): Promise<unknown> => {
  void query;
  return null;
});
const mockCommentCreate = jest.fn(async (query: unknown): Promise<unknown> => {
  void query;
  return {};
});
const mockLoggerError = jest.fn((context: unknown, message: string) => {
  void context;
  void message;
});

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: { marker: "test-auth-options" },
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    task: { findFirst: (query: unknown) => mockTaskFindFirst(query) },
    comment: { create: (query: unknown) => mockCommentCreate(query) },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: (context: unknown, message: string) =>
      mockLoggerError(context, message),
  },
}));

import { POST } from "@/app/api/comments/route";

function sessionFor(role: string): { user: { id: string; role: string } } {
  return { user: { id: "user-1", role } };
}

function commentRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function prepareCommentMocks(): void {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(sessionFor("MEMBER"));
  mockTaskFindFirst.mockResolvedValue({ id: "task-1" });
  mockCommentCreate.mockResolvedValue({
    id: "comment-1",
    content: "A useful note",
    taskId: "task-1",
    authorId: "user-1",
    author: { id: "user-1", name: "Owner", email: "owner@example.com" },
  });
}

describe("POST /api/comments", () => {
  beforeEach(prepareCommentMocks);

  it("returns 401 before reading input when no user is authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const request = commentRequest({ content: "A useful note", taskId: "task-1" });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mockGetServerSession).toHaveBeenCalledWith({
      marker: "test-auth-options",
    });
    expect(mockTaskFindFirst).not.toHaveBeenCalled();
    expect(mockCommentCreate).not.toHaveBeenCalled();
  });

  it("returns 403 before reading input for a read-only user", async () => {
    mockGetServerSession.mockResolvedValue(sessionFor("VIEWER"));
    const request = commentRequest({ content: "A useful note", taskId: "task-1" });

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mockTaskFindFirst).not.toHaveBeenCalled();
    expect(mockCommentCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/comments", () => {
  beforeEach(prepareCommentMocks);

  it("returns 400 for invalid input without querying task ownership", async () => {
    const response = await POST(commentRequest({ content: "", taskId: "task-1" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: expect.arrayContaining([
        expect.objectContaining({ path: ["content"], code: "too_small" }),
      ]),
    });
    expect(mockTaskFindFirst).not.toHaveBeenCalled();
    expect(mockCommentCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when the task is not owned by the authenticated user", async () => {
    mockTaskFindFirst.mockResolvedValue(null);

    const response = await POST(
      commentRequest({ content: "A useful note", taskId: "other-task" }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Task not found" });
    expect(mockTaskFindFirst).toHaveBeenCalledWith({
      where: { id: "other-task", project: { ownerId: "user-1" } },
      select: { id: true },
    });
    expect(mockCommentCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/comments", () => {
  beforeEach(prepareCommentMocks);

  it("creates a comment only after an ownership-scoped task lookup", async () => {
    const response = await POST(
      commentRequest({ content: "A useful note", taskId: "task-1" }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: "comment-1",
      content: "A useful note",
      taskId: "task-1",
      authorId: "user-1",
      author: { id: "user-1", name: "Owner", email: "owner@example.com" },
    });
    expect(mockTaskFindFirst).toHaveBeenCalledWith({
      where: { id: "task-1", project: { ownerId: "user-1" } },
      select: { id: true },
    });
    expect(mockCommentCreate).toHaveBeenCalledWith({
      data: { content: "A useful note", taskId: "task-1", authorId: "user-1" },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  });

  it("logs an unexpected persistence failure and returns a safe 500 body", async () => {
    const error = new Error("comment insert failed");
    mockCommentCreate.mockRejectedValue(error);

    const response = await POST(
      commentRequest({ content: "A useful note", taskId: "task-1" }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      { error },
      "Failed to create comment",
    );
  });
});
