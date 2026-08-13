import { render, screen } from "@testing-library/react";

const mockGetServerSession = jest.fn<Promise<unknown>, []>();
const mockProjectFindMany = jest.fn<Promise<unknown[]>, [unknown]>();
const mockTaskFindMany = jest.fn<Promise<unknown[]>, [unknown]>();
const mockRedirect = jest.fn((path: string): never => {
  throw new Error(`redirect:${path}`);
});

jest.mock("next-auth", () => ({
  getServerSession: () => mockGetServerSession(),
}));

jest.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/db", () => ({
  prisma: {
    project: { findMany: (query: unknown) => mockProjectFindMany(query) },
    task: { findMany: (query: unknown) => mockTaskFindMany(query) },
  },
}));

import DashboardPage from "@/app/page";

type DashboardTask = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  projectId: string;
  project: { id: string; name: string };
  assignee: { id: string; name: string } | null;
};

function task(
  id: string,
  status: DashboardTask["status"],
  assigneeName: string | null,
): DashboardTask {
  return {
    id,
    title: `Task ${id}`,
    status,
    projectId: "project-1",
    project: { id: "project-1", name: "Launch" },
    assignee: assigneeName ? { id: "user-2", name: assigneeName } : null,
  };
}

describe("DashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", name: "Ada" },
    });
    mockProjectFindMany.mockResolvedValue([{ id: "project-1" }]);
    mockTaskFindMany.mockResolvedValue([]);
  });

  it("redirects visitors to sign in without querying dashboard data", async () => {
    mockGetServerSession.mockResolvedValue(null);

    await expect(DashboardPage()).rejects.toThrow("redirect:/auth/login");

    expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
    expect(mockProjectFindMany).not.toHaveBeenCalled();
  });

  it("renders empty dashboard statistics and guidance", async () => {
    render(await DashboardPage());

    expect(screen.getByText("Welcome back, Ada")).toBeInTheDocument();
    expect(screen.getByText("No recent activity. Create a project to get started!"))
      .toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(3);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(mockProjectFindMany).toHaveBeenCalledWith({
      where: { ownerId: "user-1" },
      include: { tasks: true },
    });
  });

  it("renders every task status and assignee fallback as linked activity", async () => {
    mockProjectFindMany.mockResolvedValue([
      { id: "project-1" },
      { id: "project-2" },
    ]);
    mockTaskFindMany.mockResolvedValue([
      task("todo", "TODO", "Grace"),
      task("doing", "IN_PROGRESS", null),
      task("done", "DONE", "Linus"),
    ]);

    render(await DashboardPage());

    expect(screen.getByText(/Launch • Grace/)).toBeInTheDocument();
    expect(screen.getByText(/Launch • Unassigned/)).toBeInTheDocument();
    expect(screen.getByText("IN PROGRESS")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Task done/ })).toHaveAttribute(
      "href",
      "/projects/project-1/tasks/done",
    );
    expect(mockTaskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, orderBy: { updatedAt: "desc" } }),
    );
  });
});
