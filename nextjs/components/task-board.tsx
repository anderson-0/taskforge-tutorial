"use client";

import type { Task, User } from "@prisma/client";
import { TaskCard } from "./task-card";

type TaskWithAssignee = Task & {
  assignee: Pick<User, "id" | "name" | "email"> | null;
};

type TaskColumnProps = {
  title: string;
  emptyMessage: string;
  tasks: TaskWithAssignee[];
  projectId: string;
};

function TaskColumn({ title, emptyMessage, tasks, projectId }: TaskColumnProps) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            href={`/projects/${projectId}/tasks/${task.id}`}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskBoard({
  tasks,
  projectId,
}: {
  tasks: TaskWithAssignee[];
  projectId: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <TaskColumn title="To Do" emptyMessage="No tasks yet" tasks={tasks.filter((task) => task.status === "TODO")} projectId={projectId} />
      <TaskColumn title="In Progress" emptyMessage="No tasks in progress" tasks={tasks.filter((task) => task.status === "IN_PROGRESS")} projectId={projectId} />
      <TaskColumn title="Done" emptyMessage="No completed tasks" tasks={tasks.filter((task) => task.status === "DONE")} projectId={projectId} />
    </div>
  );
}
