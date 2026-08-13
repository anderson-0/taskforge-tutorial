const mockGetServerSession = jest.fn(
  async (...args: unknown[]): Promise<unknown> => {
    void args;
    return null;
  },
);
const mockProjectFindMany = jest.fn(async (query: unknown): Promise<unknown> => {
  void query;
  return [];
});
const mockProjectCreate = jest.fn(async (query: unknown): Promise<unknown> => {
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
      findMany: (query: unknown) => mockProjectFindMany(query),
      create: (query: unknown) => mockProjectCreate(query),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: (context: unknown, message: string) =>
      mockLoggerError(context, message),
  },
}));

import { GET, POST } from "@/app/api/projects/route";

function sessionFor(role: string): { user: { id: string; role: string } } {
  return { user: { id: "user-1", role } };
}

function projectRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function preparePostMocks(): void {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(sessionFor("MEMBER"));
  mockProjectCreate.mockResolvedValue({
    id: "project-1",
    name: "Launch",
    description: "Ship the release",
    ownerId: "user-1",
  });
}

describe("GET /api/projects", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(sessionFor("MEMBER"));
    mockProjectFindMany.mockResolvedValue([]);
  });

  it("returns 401 without querying projects when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mockGetServerSession).toHaveBeenCalledWith({
      marker: "test-auth-options",
    });
    expect(mockProjectFindMany).not.toHaveBeenCalled();
  });

  it("lists only projects owned by the authenticated user", async () => {
    const projects = [{ id: "project-1", name: "Launch" }];
    mockProjectFindMany.mockResolvedValue(projects);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(projects);
    expect(mockProjectFindMany).toHaveBeenCalledWith({
      where: { ownerId: "user-1" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        tasks: true,
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("logs list failures and returns a safe 500 body", async () => {
    const error = new Error("project query failed");
    mockProjectFindMany.mockRejectedValue(error);

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      { error },
      "Failed to list projects",
    );
  });
});

describe("POST /api/projects", () => {
  beforeEach(preparePostMocks);

  it("returns 401 before reading input when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await POST(projectRequest({ name: "Launch" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mockProjectCreate).not.toHaveBeenCalled();
  });

  it("returns 403 before reading input for a read-only user", async () => {
    mockGetServerSession.mockResolvedValue(sessionFor("VIEWER"));

    const response = await POST(projectRequest({ name: "Launch" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mockProjectCreate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid project input", async () => {
    const response = await POST(projectRequest({ name: "" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: expect.arrayContaining([
        expect.objectContaining({ path: ["name"], code: "too_small" }),
      ]),
    });
    expect(mockProjectCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/projects", () => {
  beforeEach(preparePostMocks);

  it("creates a project owned by the authenticated user", async () => {
    const response = await POST(
      projectRequest({ name: "Launch", description: "Ship the release" }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: "project-1",
      name: "Launch",
      description: "Ship the release",
      ownerId: "user-1",
    });
    expect(mockProjectCreate).toHaveBeenCalledWith({
      data: {
        name: "Launch",
        description: "Ship the release",
        ownerId: "user-1",
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  });

  it("logs create failures and returns a safe 500 body", async () => {
    const error = new Error("project insert failed");
    mockProjectCreate.mockRejectedValue(error);

    const response = await POST(projectRequest({ name: "Launch" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      { error },
      "Failed to create project",
    );
  });
});
