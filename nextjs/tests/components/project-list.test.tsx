import { render, screen, within } from "@testing-library/react";
import type { Project, Task, User } from "@prisma/client";
import { ProjectList } from "@/components/project-list";

type ProjectWithTasks = Project & {
  tasks: Task[];
  owner: Pick<User, "id" | "name" | "email">;
};

const timestamp = new Date("2025-02-01T09:00:00.000Z");
const owner: ProjectWithTasks["owner"] = {
  id: "user-1",
  name: "Grace Hopper",
  email: "grace@example.com",
};

function task(id: string, status: string): Task {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    status,
    priority: "MEDIUM",
    projectId: "project-active",
    assigneeId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const projects: ProjectWithTasks[] = [
  {
    id: "project-active",
    name: "Active launch",
    description: "Coordinate the product launch.",
    status: "ACTIVE",
    ownerId: owner.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    owner,
    tasks: [
      task("todo-1", "TODO"),
      task("todo-2", "TODO"),
      task("doing", "IN_PROGRESS"),
      task("done", "DONE"),
    ],
  },
  {
    id: "project-archived",
    name: "Archived launch",
    description: null,
    status: "ARCHIVED",
    ownerId: owner.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    owner,
    tasks: [],
  },
];

describe("ProjectList", () => {
  it("shows guidance when there are no projects", () => {
    render(<ProjectList projects={[]} />);

    expect(screen.getByText("No projects yet")).toBeInTheDocument();
    expect(screen.getByText("Create your first project to get started"))
      .toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("links active and archived projects and summarizes each task status", () => {
    render(<ProjectList projects={projects} />);

    const activeLink = screen.getByRole("link", { name: /Active launch/ });
    const archivedLink = screen.getByRole("link", { name: /Archived launch/ });

    expect(activeLink).toHaveAttribute("href", "/projects/project-active");
    expect(archivedLink).toHaveAttribute("href", "/projects/project-archived");
    expect(within(activeLink).getByText("Coordinate the product launch."))
      .toBeInTheDocument();
    expect(within(archivedLink).queryByText("Coordinate the product launch."))
      .not.toBeInTheDocument();

    expect(within(activeLink).getByText("2")).toBeInTheDocument();
    expect(within(activeLink).getAllByText("1")).toHaveLength(2);
    expect(within(archivedLink).getAllByText("0")).toHaveLength(3);

    const activeIcon = activeLink.querySelector("svg");
    const archivedIcon = archivedLink.querySelector("svg");
    expect(activeIcon).toHaveClass("text-primary");
    expect(archivedIcon).toHaveClass("text-muted-foreground");
  });
});
