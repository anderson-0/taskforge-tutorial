import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignOutButton } from "@/components/sign-out-button";

const mockSignOut = jest.fn(async (...args: unknown[]) => {
  void args;
  return undefined;
});

jest.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

describe("SignOutButton", () => {
  it("uses NextAuth's CSRF-protected sign-out flow", async () => {
    const user = userEvent.setup();
    render(<SignOutButton />);

    await user.click(screen.getByRole("button", { name: "Sign Out" }));

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/auth/login" });
  });
});
