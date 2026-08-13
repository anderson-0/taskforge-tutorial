const mockFindUnique = jest.fn(
  async (query: unknown): Promise<unknown> => {
    void query;
    return null;
  },
);
const mockCreate = jest.fn(
  async (query: unknown): Promise<Record<string, unknown>> => {
    void query;
    return {};
  },
);
const mockHash = jest.fn(
  async (password: string, rounds: number): Promise<string> => {
    void password;
    void rounds;
    return "";
  },
);

jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (query: unknown) => mockFindUnique(query),
      create: (query: unknown) => mockCreate(query),
    },
  },
}));

jest.mock("bcryptjs", () => ({
  hash: (password: string, rounds: number) => mockHash(password, rounds),
}));

import { POST } from "@/app/api/auth/register/route";

function registrationRequest(body: Record<string, unknown>): Request {
  return { json: async () => body } as Request;
}

function prepareRegistrationMocks(): void {
  jest.clearAllMocks();
  mockFindUnique.mockResolvedValue(null);
  mockHash.mockResolvedValue("password-hash");
  mockCreate.mockResolvedValue({
    id: "user-1",
    email: "learner@example.com",
    name: "Course Learner",
    role: "MEMBER",
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(prepareRegistrationMocks);

  it("does not let a public registration choose an admin role", async () => {
    const response = await POST(
      registrationRequest({
        email: "learner@example.com",
        password: "password123",
        name: "Course Learner",
        role: "ADMIN",
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      user: {
        id: "user-1",
        email: "learner@example.com",
        name: "Course Learner",
      },
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "learner@example.com" },
    });
    expect(mockHash).toHaveBeenCalledWith("password123", 12);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        email: "learner@example.com",
        password: "password-hash",
        name: "Course Learner",
      },
    });
  });
});

describe("POST /api/auth/register", () => {
  beforeEach(prepareRegistrationMocks);

  it("rejects an email address that is already registered", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing-user" });

    const response = await POST(
      registrationRequest({
        email: "learner@example.com",
        password: "password123",
        name: "Course Learner",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "User already exists",
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "learner@example.com" },
    });
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/register", () => {
  beforeEach(prepareRegistrationMocks);

  it("rejects invalid registration input", async () => {
    const response = await POST(
      registrationRequest({
        email: "not-an-email",
        password: "short",
        name: "C",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: expect.arrayContaining([
        expect.objectContaining({ path: ["email"], code: "invalid_string" }),
        expect.objectContaining({ path: ["password"], code: "too_small" }),
        expect.objectContaining({ path: ["name"], code: "too_small" }),
      ]),
    });
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does not leak unexpected registration errors", async () => {
    mockFindUnique.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      registrationRequest({
        email: "learner@example.com",
        password: "password123",
        name: "Course Learner",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
  });
});
