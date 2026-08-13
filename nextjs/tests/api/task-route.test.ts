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
const mockUserFindUnique = jest.fn(async (query: unknown): Promise<unknown> => {
  void query;
  return null;
});
const mockTaskUpdate = jest.fn(async (query: unknown): Promise<unknown> => {
  void query;
  return {};
});
const mockTaskDelete = jest.fn(async (query: unknown): Promise<unknown> => {
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
    task: {
      findFirst: (query: unknown) => mockTaskFindFirst(query),
      update: (query: unknown) => mockTaskUpdate(query),
      delete: (query: unknown) => mockTaskDelete(query),
    },
    user: { findUnique: (query: unknown) => mockUserFindUnique(query) },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: (context: unknown, message: string) =>
      mockLoggerError(context, message),
  },
}));

import { DELETE, GET, PATCH } from "@/app/api/tasks/[id]/route";

const task = {
  id: "task-1",
  title: "Prepare release",
  projectId: "project-1",
  assigneeId: null,
};

function sessionFor(role: string): { user: { id: string; role: string } } {
  return { user: { id: "user-1", role } };
}

function routeContext(id = "task-1"): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/tasks/task-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function prepareGetTests(): void {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(sessionFor("MEMBER"));
  mockTaskFindFirst.mockResolvedValue(task);
}

function registerGetAuthenticationTest(): void {
  it("returns 401 without querying a task when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), routeContext());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mockTaskFindFirst).not.toHaveBeenCalled();
  });
}

function registerGetLookupTests(): void {
  it("returns 404 when the ownership-scoped lookup finds no task", async () => {
    mockTaskFindFirst.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost"),
      routeContext("other-task"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Task not found" });
    expect(mockTaskFindFirst).toHaveBeenCalledWith({
      where: { id: "other-task", project: { ownerId: "user-1" } },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  });

  it("returns the owned task with its requested relations", async () => {
    const response = await GET(new Request("http://localhost"), routeContext());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(task);
    expect(mockTaskFindFirst).toHaveBeenCalledWith({
      where: { id: "task-1", project: { ownerId: "user-1" } },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  });
}

function registerGetFailureTest(): void {
  it("logs lookup failures and returns a safe 500 body", async () => {
    const error = new Error("task lookup failed");
    mockTaskFindFirst.mockRejectedValue(error);

    const response = await GET(new Request("http://localhost"), routeContext());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      { error },
      "Failed to get task",
    );
  });
}

describe("GET /api/tasks/:id", () => {
  beforeEach(prepareGetTests);
  registerGetAuthenticationTest();
  registerGetLookupTests();
  registerGetFailureTest();
});

function preparePatchTests(): void {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(sessionFor("MEMBER"));
  mockTaskFindFirst.mockResolvedValue(task);
  mockUserFindUnique.mockResolvedValue({ id: "assignee-1" });
  mockTaskUpdate.mockResolvedValue({ ...task, assigneeId: "assignee-1" });
}

function registerPatchAuthorizationTests(): void {
  it("returns 401 before reading input when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ status: "DONE" }), routeContext());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mockTaskFindFirst).not.toHaveBeenCalled();
    expect(mockTaskUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 before reading input for a read-only user", async () => {
    mockGetServerSession.mockResolvedValue(sessionFor("VIEWER"));

    const response = await PATCH(patchRequest({ status: "DONE" }), routeContext());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mockTaskFindFirst).not.toHaveBeenCalled();
    expect(mockTaskUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid input without querying task ownership", async () => {
    const response = await PATCH(patchRequest({ priority: "CRITICAL" }), routeContext());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: expect.arrayContaining([
        expect.objectContaining({ path: ["priority"], code: "invalid_enum_value" }),
      ]),
    });
    expect(mockTaskFindFirst).not.toHaveBeenCalled();
    expect(mockTaskUpdate).not.toHaveBeenCalled();
  });
}

function registerPatchLookupTests(): void {
  it("returns 404 when the task is outside the user ownership scope", async () => {
    mockTaskFindFirst.mockResolvedValue(null);

    const response = await PATCH(
      patchRequest({ title: "Private" }),
      routeContext("other-task"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Task not found" });
    expect(mockTaskFindFirst).toHaveBeenCalledWith({
      where: { id: "other-task", project: { ownerId: "user-1" } },
    });
    expect(mockTaskUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the requested assignee does not exist", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const response = await PATCH(
      patchRequest({ assigneeId: "missing-user" }),
      routeContext(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Assignee not found" });
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: "missing-user" },
      select: { id: true },
    });
    expect(mockTaskUpdate).not.toHaveBeenCalled();
  });
}

function registerPatchMutationTests(): void {
  it("updates an owned task after verifying its requested assignee", async () => {
    const data = {
      title: "Prepare release v2",
      status: "DONE",
      assigneeId: "assignee-1",
    };

    const response = await PATCH(patchRequest(data), routeContext());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ...task,
      assigneeId: "assignee-1",
    });
    expect(mockTaskFindFirst).toHaveBeenCalledWith({
      where: { id: "task-1", project: { ownerId: "user-1" } },
    });
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: "assignee-1" },
      select: { id: true },
    });
    expect(mockTaskUpdate).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });
  });

  it("clears an assignee without querying the users table", async () => {
    mockTaskUpdate.mockResolvedValue(task);

    const response = await PATCH(patchRequest({ assigneeId: null }), routeContext());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(task);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockTaskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { assigneeId: null } }),
    );
  });
}

function registerPatchFailureTest(): void {
  it("logs update failures and returns a safe 500 body", async () => {
    const error = new Error("task update failed");
    mockTaskUpdate.mockRejectedValue(error);

    const response = await PATCH(patchRequest({ title: "New title" }), routeContext());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      { error },
      "Failed to update task",
    );
  });
}

describe("PATCH /api/tasks/:id", () => {
  beforeEach(preparePatchTests);
  registerPatchAuthorizationTests();
  registerPatchLookupTests();
  registerPatchMutationTests();
  registerPatchFailureTest();
});

function prepareDeleteTests(): void {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(sessionFor("MEMBER"));
  mockTaskFindFirst.mockResolvedValue(task);
  mockTaskDelete.mockResolvedValue(task);
}

function registerDeleteAuthorizationTests(): void {
  it("returns 401 without querying a task when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost"), routeContext());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mockTaskFindFirst).not.toHaveBeenCalled();
    expect(mockTaskDelete).not.toHaveBeenCalled();
  });

  it("returns 403 without querying a task for a read-only user", async () => {
    mockGetServerSession.mockResolvedValue(sessionFor("VIEWER"));

    const response = await DELETE(new Request("http://localhost"), routeContext());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mockTaskFindFirst).not.toHaveBeenCalled();
    expect(mockTaskDelete).not.toHaveBeenCalled();
  });
}

function registerDeleteMutationTests(): void {
  it("returns 404 when the task is outside the user ownership scope", async () => {
    mockTaskFindFirst.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost"),
      routeContext("other-task"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Task not found" });
    expect(mockTaskFindFirst).toHaveBeenCalledWith({
      where: { id: "other-task", project: { ownerId: "user-1" } },
    });
    expect(mockTaskDelete).not.toHaveBeenCalled();
  });

  it("deletes an owned task after verifying ownership", async () => {
    const response = await DELETE(new Request("http://localhost"), routeContext());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mockTaskFindFirst).toHaveBeenCalledWith({
      where: { id: "task-1", project: { ownerId: "user-1" } },
    });
    expect(mockTaskDelete).toHaveBeenCalledWith({ where: { id: "task-1" } });
  });
}

function registerDeleteFailureTest(): void {
  it("logs delete failures and returns a safe 500 body", async () => {
    const error = new Error("task delete failed");
    mockTaskDelete.mockRejectedValue(error);

    const response = await DELETE(new Request("http://localhost"), routeContext());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      { error },
      "Failed to delete task",
    );
  });
}

describe("DELETE /api/tasks/:id", () => {
  beforeEach(prepareDeleteTests);
  registerDeleteAuthorizationTests();
  registerDeleteMutationTests();
  registerDeleteFailureTest();
});
