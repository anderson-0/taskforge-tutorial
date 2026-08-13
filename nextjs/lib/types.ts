import type { User, Project, Task, Comment, Label } from "@/generated/prisma/client";

export type Role = "ADMIN" | "MEMBER" | "VIEWER";
export type ProjectStatus = "ACTIVE" | "ARCHIVED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type {
  User,
  Project,
  Task,
  Comment,
  Label,
};

export type TaskWithDetails = Task & {
  assignee: User | null;
  project: Project;
  comments: Comment[];
};

export type ProjectWithTasks = Project & {
  tasks: Task[];
  owner: User;
};
