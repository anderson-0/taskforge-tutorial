import { Children, type ReactElement, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";

const mockGetServerSession = jest.fn<Promise<unknown>, []>();

jest.mock("next-auth", () => ({
  getServerSession: () => mockGetServerSession(),
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("next/font/google", () => ({
  Inter: () => ({ className: "inter-font" }),
}));

jest.mock("@/components/sign-out-button", () => ({
  SignOutButton: () => <button type="button">Sign Out</button>,
}));

import RootLayout, { metadata } from "@/app/layout";

type ElementWithChildren = ReactElement<{ children: ReactNode }>;

async function renderLayout(children: ReactNode): Promise<void> {
  const layout = await RootLayout({ children }) as ElementWithChildren;
  const body = Children.only(layout.props.children) as ElementWithChildren;
  render(body.props.children);
}

describe("RootLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exports the TaskForge metadata", () => {
    expect(metadata).toEqual({
      title: "TaskForge - Project Management",
      description: "Modern project management application built with Next.js",
    });
  });

  it("renders authenticated navigation and the user's name", async () => {
    mockGetServerSession.mockResolvedValue({ user: { name: "Ada" } });

    await renderLayout(<p>Workspace</p>);

    expect(screen.getByRole("link", { name: "TaskForge" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
  });

  it("renders only public content without a session", async () => {
    mockGetServerSession.mockResolvedValue(null);

    await renderLayout(<p>Public form</p>);

    expect(screen.getByText("Public form")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("handles a session without a hydrated user", async () => {
    mockGetServerSession.mockResolvedValue({});

    await renderLayout(<p>Workspace</p>);

    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
  });
});
