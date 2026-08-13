const mockGetServerSession = jest.fn(
  async (...args: unknown[]): Promise<unknown> => {
    void args;
    return null;
  },
);
const mockTaskFindMany = jest.fn(async (query: unknown): Promise<unknown> => {
  void query;
  return [];
});
const mockProjectFindFirst = jest.fn(async (query: unknown): Promise<unknown> => {
  void query;
  return null;
});
const mockUserFindUnique = jest.fn(async (query: unknown): Promise<unknown> => {
  void query;
  return null;
});
const mockTaskCreate = jest.fn(async (query: unknown): Promise<unknown> => {
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
      findMany: (query: unknown) => mockTaskFindMany(query),
      create: (query: unknown) => mockTaskCreate(query),
    },
    project: { findFirst: (query: unknown) => mockProjectFindFirst(query) },
    user: { findUnique: (query: unknown) => mockUserFindUnique(query) },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: (context: unknown, message: string) =>
      mockLoggerError(context, message),
  },
}));

import { GET, POST } from "@/app/api/tasks/route";

const task = {
  id: "task-1",
  title: "Prepare release",
  projectId: "project-1",
  assigneeId: "assignee-1",
};

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true } },
  comments: {
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  },
};

const taskCreateInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true } },
};

function sessionFor(role: string): { user: { id: string; role: string } } {
  return { user: { id: "user-1", role } };
}

function taskRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function prepareGetTests(): void {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(sessionFor("MEMBER"));
  mockTaskFindMany.mockResolvedValue([task]);
}

function registerGetAuthenticationTest(): void {
  it("returns 401 without querying tasks when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/tasks"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mockGetServerSession).toHaveBeenCalledWith({
      marker: "test-auth-options",
    });
    expect(mockTaskFindMany).not.toHaveBeenCalled();
  });
}

function registerGetQueryTests(): void {
  it("lists tasks through both project and owner scopes", async () => {
    const response = await GET(
      new Request("http://localhost/api/tasks?projectId=project-1"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([task]);
    expect(mockTaskFindMany).toHaveBeenCalledWith({
      where: {
        projectId: "project-1",
        project: { ownerId: "user-1" },
      },
      include: taskInclude,
      orderBy: { createdAt: "desc" },
    });
  });

  it("still scopes an unfiltered task list to the authenticated owner", async () => {
    const response = await GET(new Request("http://localhost/api/tasks"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([task]);
    expect(mockTaskFindMany).toHaveBeenCalledWith({
      where: { project: { ownerId: "user-1" } },
      include: taskInclude,
      orderBy: { createdAt: "desc" },
    });
  });
}

function registerGetFailureTest(): void {
  it("logs list failures and returns a safe 500 body", async () => {
    const error = new Error("task query failed");
    mockTaskFindMany.mockRejectedValue(error);

    const response = await GET(new Request("http://localhost/api/tasks"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      { error },
      "Failed to list tasks",
    );
  });
}

describe("GET /api/tasks", () => {
  beforeEach(prepareGetTests);
  registerGetAuthenticationTest();
  registerGetQueryTests();
  registerGetFailureTest();
});

function preparePostTests(): void {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(sessionFor("MEMBER"));
  mockProjectFindFirst.mockResolvedValue({ id: "project-1" });
  mockUserFindUnique.mockResolvedValue({ id: "assignee-1" });
  mockTaskCreate.mockResolvedValue(task);
}

function registerPostAuthorizationTests(): void {
  it("returns 401 before reading input when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await POST(
      taskRequest({ title: "Prepare release", projectId: "project-1" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mockProjectFindFirst).not.toHaveBeenCalled();
    expect(mockTaskCreate).not.toHaveBeenCalled();
  });

  it("returns 403 before reading input for a read-only user", async () => {
    mockGetServerSession.mockResolvedValue(sessionFor("VIEWER"));

    const response = await POST(
      taskRequest({ title: "Prepare release", projectId: "project-1" }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mockProjectFindFirst).not.toHaveBeenCalled();
    expect(mockTaskCreate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid task input without querying ownership", async () => {
    const response = await POST(taskRequest({ title: "" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: expect.arrayContaining([
        expect.objectContaining({ path: ["title"], code: "too_small" }),
        expect.objectContaining({ path: ["projectId"], code: "invalid_type" }),
      ]),
    });
    expect(mockProjectFindFirst).not.toHaveBeenCalled();
    expect(mockTaskCreate).not.toHaveBeenCalled();
  });
}

function registerPostLookupTests(): void {
  it("returns 404 when the selected project is not owned by the user", async () => {
    mockProjectFindFirst.mockResolvedValue(null);

    const response = await POST(
      taskRequest({ title: "Prepare release", projectId: "other-project" }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Project not found" });
    expect(mockProjectFindFirst).toHaveBeenCalledWith({
      where: { id: "other-project", ownerId: "user-1" },
      select: { id: true },
    });
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockTaskCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when the requested assignee does not exist", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const response = await POST(
      taskRequest({
        title: "Prepare release",
        projectId: "project-1",
        assigneeId: "missing-user",
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Assignee not found" });
    expect(mockProjectFindFirst).toHaveBeenCalledWith({
      where: { id: "project-1", ownerId: "user-1" },
      select: { id: true },
    });
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: "missing-user" },
      select: { id: true },
    });
    expect(mockTaskCreate).not.toHaveBeenCalled();
  });
}

function registerPostCreationTests(): void {
  it("creates a task with a verified assignee in an owned project", async () => {
    const data = {
      title: "Prepare release",
      description: "Cut a release candidate",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectId: "project-1",
      assigneeId: "assignee-1",
    };

    const response = await POST(taskRequest(data));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(task);
    expect(mockProjectFindFirst).toHaveBeenCalledWith({
      where: { id: "project-1", ownerId: "user-1" },
      select: { id: true },
    });
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: "assignee-1" },
      select: { id: true },
    });
    expect(mockTaskCreate).toHaveBeenCalledWith({ data, include: taskCreateInclude });
  });

  it("creates an unassigned task without querying the users table", async () => {
    const data = { title: "Prepare release", projectId: "project-1" };
    mockTaskCreate.mockResolvedValue({ ...task, assigneeId: null });

    const response = await POST(taskRequest(data));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ...task, assigneeId: null });
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockTaskCreate).toHaveBeenCalledWith({ data, include: taskCreateInclude });
  });
}

function registerPostFailureTest(): void {
  it("logs create failures and returns a safe 500 body", async () => {
    const error = new Error("project lookup failed");
    mockProjectFindFirst.mockRejectedValue(error);

    const response = await POST(
      taskRequest({ title: "Prepare release", projectId: "project-1" }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      { error },
      "Failed to create task",
    );
  });
}

describe("POST /api/tasks", () => {
  beforeEach(preparePostTests);
  registerPostAuthorizationTests();
  registerPostLookupTests();
  registerPostCreationTests();
  registerPostFailureTest();
});
