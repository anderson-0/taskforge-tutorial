import { render, screen, within } from "@testing-library/react";
import type { Task, User } from "@/generated/prisma/client";
import { TaskBoard } from "@/components/task-board";

type TaskWithAssignee = Task & {
  assignee: Pick<User, "id" | "name" | "email"> | null;
};

const timestamp = new Date("2025-03-01T10:00:00.000Z");

function task(id: string, status: string): TaskWithAssignee {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    status,
    priority: "MEDIUM",
    projectId: "project-1",
    assigneeId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    assignee: null,
  };
}

describe("TaskBoard", () => {
  it("groups tasks by status and links every card to its project task page", () => {
    render(
      <TaskBoard
        projectId="project-1"
        tasks={[
          task("todo", "TODO"),
          task("doing", "IN_PROGRESS"),
          task("done", "DONE"),
        ]}
      />,
    );

    const todoHeading = screen.getByRole("heading", { name: "To Do" });
    const progressHeading = screen.getByRole("heading", { name: "In Progress" });
    const doneHeading = screen.getByRole("heading", { name: "Done" });
    const todoColumn = todoHeading.parentElement?.parentElement;
    const progressColumn = progressHeading.parentElement?.parentElement;
    const doneColumn = doneHeading.parentElement?.parentElement;

    expect(todoColumn).not.toBeNull();
    expect(progressColumn).not.toBeNull();
    expect(doneColumn).not.toBeNull();
    expect(within(todoColumn!).getByText("Task todo")).toBeInTheDocument();
    expect(within(progressColumn!).getByText("Task doing")).toBeInTheDocument();
    expect(within(doneColumn!).getByText("Task done")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Task todo/ })).toHaveAttribute(
      "href",
      "/projects/project-1/tasks/todo",
    );
    expect(screen.getByRole("link", { name: /Task doing/ })).toHaveAttribute(
      "href",
      "/projects/project-1/tasks/doing",
    );
    expect(screen.getByRole("link", { name: /Task done/ })).toHaveAttribute(
      "href",
      "/projects/project-1/tasks/done",
    );
    expect(screen.getAllByText("1 tasks")).toHaveLength(3);
  });

  it("shows a distinct empty state in every status column", () => {
    render(<TaskBoard projectId="project-1" tasks={[]} />);

    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.getByText("No tasks in progress")).toBeInTheDocument();
    expect(screen.getByText("No completed tasks")).toBeInTheDocument();
    expect(screen.getAllByText("0 tasks")).toHaveLength(3);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
