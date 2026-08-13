const mockGetServerSession = jest.fn(
  async (...args: unknown[]): Promise<unknown> => {
    void args;
    return null;
  },
);
const mockProjectFindFirst = jest.fn(async (query: unknown): Promise<unknown> => {
  void query;
  return null;
});
const mockProjectUpdate = jest.fn(async (query: unknown): Promise<unknown> => {
  void query;
  return {};
});
const mockProjectDelete = jest.fn(async (query: unknown): Promise<unknown> => {
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
    project: {
      findFirst: (query: unknown) => mockProjectFindFirst(query),
      update: (query: unknown) => mockProjectUpdate(query),
      delete: (query: unknown) => mockProjectDelete(query),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: (context: unknown, message: string) =>
      mockLoggerError(context, message),
  },
}));

import { DELETE, GET, PATCH } from "@/app/api/projects/[id]/route";

const project = {
  id: "project-1",
  name: "Launch",
  description: "Ship the release",
  status: "ACTIVE",
  ownerId: "user-1",
};

function sessionFor(role: string): { user: { id: string; role: string } } {
  return { user: { id: "user-1", role } };
}

function routeContext(id = "project-1"): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/projects/project-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function prepareGetMocks(): void {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(sessionFor("MEMBER"));
  mockProjectFindFirst.mockResolvedValue(project);
}

function preparePatchMocks(): void {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(sessionFor("MEMBER"));
  mockProjectFindFirst.mockResolvedValue(project);
  mockProjectUpdate.mockResolvedValue({ ...project, status: "ARCHIVED" });
}

function prepareDeleteMocks(): void {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(sessionFor("MEMBER"));
  mockProjectFindFirst.mockResolvedValue(project);
  mockProjectDelete.mockResolvedValue(project);
}

describe("GET /api/projects/:id", () => {
  beforeEach(prepareGetMocks);

  it("returns 401 without resolving or querying a project", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), routeContext());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mockProjectFindFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the ownership-scoped lookup finds no project", async () => {
    mockProjectFindFirst.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost"),
      routeContext("other-project"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Project not found" });
    expect(mockProjectFindFirst).toHaveBeenCalledWith({
      where: { id: "other-project", ownerId: "user-1" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        labels: true,
      },
    });
  });
});

describe("GET /api/projects/:id", () => {
  beforeEach(prepareGetMocks);

  it("returns the owned project with its requested relations", async () => {
    const response = await GET(new Request("http://localhost"), routeContext());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(project);
    expect(mockProjectFindFirst).toHaveBeenCalledWith({
      where: { id: "project-1", ownerId: "user-1" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        labels: true,
      },
    });
  });

  it("logs lookup failures and returns a safe 500 body", async () => {
    const error = new Error("project lookup failed");
    mockProjectFindFirst.mockRejectedValue(error);

    const response = await GET(new Request("http://localhost"), routeContext());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      { error },
      "Failed to get project",
    );
  });
});

describe("PATCH /api/projects/:id", () => {
  beforeEach(preparePatchMocks);

  it("returns 401 without reading input when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ status: "ARCHIVED" }), routeContext());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mockProjectFindFirst).not.toHaveBeenCalled();
    expect(mockProjectUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 without reading input for a read-only user", async () => {
    mockGetServerSession.mockResolvedValue(sessionFor("VIEWER"));

    const response = await PATCH(patchRequest({ status: "ARCHIVED" }), routeContext());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mockProjectFindFirst).not.toHaveBeenCalled();
    expect(mockProjectUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid update without querying ownership", async () => {
    const response = await PATCH(patchRequest({ status: "DELETED" }), routeContext());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: expect.arrayContaining([
        expect.objectContaining({ path: ["status"], code: "invalid_enum_value" }),
      ]),
    });
    expect(mockProjectFindFirst).not.toHaveBeenCalled();
    expect(mockProjectUpdate).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/projects/:id", () => {
  beforeEach(preparePatchMocks);

  it("returns 404 when the project is outside the user ownership scope", async () => {
    mockProjectFindFirst.mockResolvedValue(null);

    const response = await PATCH(
      patchRequest({ name: "Private" }),
      routeContext("other-project"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Project not found" });
    expect(mockProjectFindFirst).toHaveBeenCalledWith({
      where: { id: "other-project", ownerId: "user-1" },
    });
    expect(mockProjectUpdate).not.toHaveBeenCalled();
  });

  it("updates a project only after verifying ownership", async () => {
    const response = await PATCH(
      patchRequest({ name: "Launch v2", status: "ARCHIVED" }),
      routeContext(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ...project,
      status: "ARCHIVED",
    });
    expect(mockProjectFindFirst).toHaveBeenCalledWith({
      where: { id: "project-1", ownerId: "user-1" },
    });
    expect(mockProjectUpdate).toHaveBeenCalledWith({
      where: { id: "project-1" },
      data: { name: "Launch v2", status: "ARCHIVED" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  });

  it("logs update failures and returns a safe 500 body", async () => {
    const error = new Error("project update failed");
    mockProjectUpdate.mockRejectedValue(error);

    const response = await PATCH(patchRequest({ name: "Launch v2" }), routeContext());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      { error },
      "Failed to update project",
    );
  });
});

describe("DELETE /api/projects/:id", () => {
  beforeEach(prepareDeleteMocks);

  it("returns 401 without querying a project when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost"), routeContext());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mockProjectFindFirst).not.toHaveBeenCalled();
    expect(mockProjectDelete).not.toHaveBeenCalled();
  });

  it("returns 403 without querying a project for a read-only user", async () => {
    mockGetServerSession.mockResolvedValue(sessionFor("VIEWER"));

    const response = await DELETE(new Request("http://localhost"), routeContext());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mockProjectFindFirst).not.toHaveBeenCalled();
    expect(mockProjectDelete).not.toHaveBeenCalled();
  });

  it("returns 404 when the project is outside the user ownership scope", async () => {
    mockProjectFindFirst.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost"),
      routeContext("other-project"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Project not found" });
    expect(mockProjectFindFirst).toHaveBeenCalledWith({
      where: { id: "other-project", ownerId: "user-1" },
    });
    expect(mockProjectDelete).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/projects/:id", () => {
  beforeEach(prepareDeleteMocks);

  it("deletes a project only after verifying ownership", async () => {
    const response = await DELETE(new Request("http://localhost"), routeContext());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mockProjectFindFirst).toHaveBeenCalledWith({
      where: { id: "project-1", ownerId: "user-1" },
    });
    expect(mockProjectDelete).toHaveBeenCalledWith({ where: { id: "project-1" } });
  });

  it("logs delete failures and returns a safe 500 body", async () => {
    const error = new Error("project delete failed");
    mockProjectDelete.mockRejectedValue(error);

    const response = await DELETE(new Request("http://localhost"), routeContext());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      { error },
      "Failed to delete project",
    );
  });
});
