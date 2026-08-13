const mockGetServerSession = jest.fn(async (...args: unknown[]) => {
  void args;
  return null as unknown;
});
const mockProjectCreate = jest.fn(async (query: unknown) => {
  void query;
  return {};
});
const mockTaskFindMany = jest.fn(async (query: unknown) => {
  void query;
  return [];
});
const mockTaskFindFirst = jest.fn(async (query: unknown) => {
  void query;
  return null as unknown;
});
const mockTaskUpdate = jest.fn(async (query: unknown) => {
  void query;
  return {};
});
const mockUserFindUnique = jest.fn(async (query: unknown) => {
  void query;
  return null as unknown;
});
const mockCommentCreate = jest.fn(async (query: unknown) => {
  void query;
  return {};
});

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    project: { create: (query: unknown) => mockProjectCreate(query) },
    task: {
      findMany: (query: unknown) => mockTaskFindMany(query),
      findFirst: (query: unknown) => mockTaskFindFirst(query),
      update: (query: unknown) => mockTaskUpdate(query),
    },
    user: { findUnique: (query: unknown) => mockUserFindUnique(query) },
    comment: { create: (query: unknown) => mockCommentCreate(query) },
  },
}));

import { POST as createProject } from "@/app/api/projects/route";
import { GET as listTasks } from "@/app/api/tasks/route";
import { PATCH as updateTask } from "@/app/api/tasks/[id]/route";
import { POST as createComment } from "@/app/api/comments/route";

function sessionFor(role: string) {
  return { user: { id: "user-1", role } };
}

function jsonRequest(url: string, body: Record<string, unknown>): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function clearAuthorizationMocks(): void {
  jest.clearAllMocks();
}

describe("API authorization boundaries", () => {
  beforeEach(clearAuthorizationMocks);

  it("blocks a viewer from creating a project", async () => {
    mockGetServerSession.mockResolvedValue(sessionFor("VIEWER"));

    const response = await createProject(
      jsonRequest("http://localhost/api/projects", { name: "Forbidden" }),
    );

    expect(response.status).toBe(403);
    expect(mockProjectCreate).not.toHaveBeenCalled();
  });

  it("scopes a task listing through the current project owner", async () => {
    mockGetServerSession.mockResolvedValue(sessionFor("MEMBER"));

    const response = await listTasks(
      new Request("http://localhost/api/tasks?projectId=project-1"),
    );

    expect(response.status).toBe(200);
    expect(mockTaskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: "project-1",
          project: { ownerId: "user-1" },
        },
      }),
    );
  });
});

describe("API authorization boundaries", () => {
  beforeEach(clearAuthorizationMocks);

  it("does not create a comment without access to its task", async () => {
    mockGetServerSession.mockResolvedValue(sessionFor("MEMBER"));
    mockTaskFindFirst.mockResolvedValue(null);

    const response = await createComment(
      jsonRequest("http://localhost/api/comments", {
        content: "Private task comment",
        taskId: "task-owned-by-someone-else",
      }),
    );

    expect(response.status).toBe(404);
    expect(mockTaskFindFirst).toHaveBeenCalledWith({
      where: {
        id: "task-owned-by-someone-else",
        project: { ownerId: "user-1" },
      },
      select: { id: true },
    });
    expect(mockCommentCreate).not.toHaveBeenCalled();
  });

  it("rejects a task update with a nonexistent assignee", async () => {
    mockGetServerSession.mockResolvedValue(sessionFor("MEMBER"));
    mockTaskFindFirst.mockResolvedValue({ id: "task-1" });
    mockUserFindUnique.mockResolvedValue(null);

    const response = await updateTask(
      jsonRequest("http://localhost/api/tasks/task-1", {
        assigneeId: "missing-user",
      }),
      { params: Promise.resolve({ id: "task-1" }) },
    );

    expect(response.status).toBe(404);
    expect(mockTaskUpdate).not.toHaveBeenCalled();
  });
});
