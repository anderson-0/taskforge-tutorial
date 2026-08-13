import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type SignInResult = { error?: string } | undefined;

const mockSignIn = jest.fn<
  Promise<SignInResult>,
  [string, Record<string, unknown>]
>();
const mockReplace = jest.fn<void, [string]>();
const mockRefresh = jest.fn<void, []>();

jest.mock("next-auth/react", () => ({
  signIn: (provider: string, options: Record<string, unknown>) =>
    mockSignIn(provider, options),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

import LoginPage from "@/app/auth/login/page";
import RegisterPage from "@/app/auth/register/page";

const originalFetch = globalThis.fetch;

async function enterLoginCredentials(): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "password123");
  await user.click(screen.getByRole("button", { name: "Sign In" }));
}

async function enterRegistration(): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "password123");
  await user.click(screen.getByRole("button", { name: "Create Account" }));
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue({});
  });

  it("submits credentials and refreshes the dashboard on success", async () => {
    render(<LoginPage />);

    await enterLoginCredentials();

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "ada@example.com",
      password: "password123",
      redirect: false,
    });
    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/auth/register",
    );
  });

  it("shows an invalid-credentials message returned by NextAuth", async () => {
    mockSignIn.mockResolvedValue({ error: "CredentialsSignin" });
    render(<LoginPage />);

    await enterLoginCredentials();

    expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows a safe message when sign-in throws", async () => {
    mockSignIn.mockRejectedValue(new Error("provider unavailable"));
    render(<LoginPage />);

    await enterLoginCredentials();

    expect(screen.getByText("An error occurred. Please try again."))
      .toBeInTheDocument();
  });

  it("disables fields and reports progress while signing in", async () => {
    let resolveSignIn: (result: SignInResult) => void = () => undefined;
    mockSignIn.mockReturnValue(new Promise((resolve) => {
      resolveSignIn = resolve;
    }));
    render(<LoginPage />);

    await enterLoginCredentials();

    expect(screen.getByRole("button", { name: "Signing in..." }))
      .toBeDisabled();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    resolveSignIn({});
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("posts registration data and navigates to sign in", async () => {
    let resolveFetch: (response: Response) => void = () => undefined;
    jest.mocked(globalThis.fetch).mockReturnValue(new Promise((resolve) => {
      resolveFetch = resolve;
    }));
    render(<RegisterPage />);

    await enterRegistration();
    expect(screen.getByRole("button", { name: "Creating account..." }))
      .toBeDisabled();
    resolveFetch(jsonResponse({}, 201));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/auth/login"),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "password123",
      }),
    });
  });

  it("renders the API's registration error", async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse({ error: "User already exists" }, 400),
    );
    render(<RegisterPage />);

    await enterRegistration();

    expect(screen.getByText("User already exists")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("falls back when a failed response has no error message", async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({}, 400));
    render(<RegisterPage />);

    await enterRegistration();

    expect(screen.getByText("Registration failed")).toBeInTheDocument();
  });

  it("shows a safe message when registration throws", async () => {
    jest.mocked(globalThis.fetch).mockRejectedValue(
      new Error("network unavailable"),
    );
    render(<RegisterPage />);

    await enterRegistration();

    expect(screen.getByText("An error occurred. Please try again."))
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
  });
