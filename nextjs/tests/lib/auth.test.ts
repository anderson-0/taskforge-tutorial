const mockCompare = jest.fn<Promise<boolean>, [string, string]>();
const mockFindUnique = jest.fn<Promise<unknown>, [unknown]>();

jest.mock("bcryptjs", () => ({
  compare: (password: string, hash: string) => mockCompare(password, hash),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: (query: unknown) => mockFindUnique(query) },
  },
}));

jest.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  default: (options: unknown) => options,
}));

import { authOptions } from "@/lib/auth";

type AuthorizedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type Credentials = { email?: string; password?: string } | undefined;

type CredentialsProvider = {
  authorize: (credentials: Credentials) => Promise<AuthorizedUser | null>;
};

type AuthCallbacks = {
  jwt: (args: {
    token: Record<string, unknown>;
    user?: AuthorizedUser;
  }) => Promise<Record<string, unknown>>;
  session: (args: {
    session: { user?: Record<string, unknown>; expires: string };
    token: Record<string, unknown>;
  }) => Promise<{ user?: Record<string, unknown>; expires: string }>;
};

const provider = authOptions.providers[0] as unknown as CredentialsProvider;
const callbacks = authOptions.callbacks as unknown as AuthCallbacks;

const user = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada",
  role: "MEMBER",
  password: "stored-hash",
};

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUnique.mockResolvedValue(user);
    mockCompare.mockResolvedValue(true);
  });

  it("uses JWT sessions and the custom sign-in page", () => {
    expect(authOptions.session).toEqual({ strategy: "jwt" });
    expect(authOptions.pages).toEqual({ signIn: "/auth/login" });
  });

  it.each([
    undefined,
    {},
    { email: "ada@example.com" },
    { password: "password123" },
  ])("rejects incomplete credentials: %p", async (credentials) => {
    await expect(provider.authorize(credentials)).resolves.toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("rejects an unknown user", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(provider.authorize({
      email: "missing@example.com",
      password: "password123",
    })).resolves.toBeNull();

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "missing@example.com" },
    });
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it("rejects an invalid password", async () => {
    mockCompare.mockResolvedValue(false);

    await expect(provider.authorize({
      email: "ada@example.com",
      password: "wrong-password",
    })).resolves.toBeNull();

    expect(mockCompare).toHaveBeenCalledWith("wrong-password", "stored-hash");
  });

  it("returns only the authenticated user's session identity", async () => {
    await expect(provider.authorize({
      email: "ada@example.com",
      password: "password123",
    })).resolves.toEqual({
      id: "user-1",
      email: "ada@example.com",
      name: "Ada",
      role: "MEMBER",
    });
  });

  it("adds identity fields to a JWT when a user signs in", async () => {
    const token = { subject: "existing" };

    await expect(callbacks.jwt({ token, user })).resolves.toEqual({
      subject: "existing",
      id: "user-1",
      role: "MEMBER",
    });
  });

  it("leaves an existing JWT unchanged without a signing-in user", async () => {
    const token = { id: "user-1", role: "MEMBER" };

    await expect(callbacks.jwt({ token })).resolves.toBe(token);
  });

  it("copies identity fields from the token to the session user", async () => {
    const session = { user: { name: "Ada" }, expires: "future" };

    await expect(callbacks.session({
      session,
      token: { id: "user-1", role: "MEMBER" },
    })).resolves.toEqual({
      user: { name: "Ada", id: "user-1", role: "MEMBER" },
      expires: "future",
    });
  });

  it("leaves a session without a user unchanged", async () => {
    const session = { expires: "future" };

    await expect(callbacks.session({
      session,
      token: { id: "user-1", role: "MEMBER" },
    })).resolves.toBe(session);
  });
