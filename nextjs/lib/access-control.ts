import type { Prisma } from "@prisma/client";

export function canMutate(role: string | undefined): boolean {
  return role === "ADMIN" || role === "MEMBER";
}

export function ownedProjectWhere(
  projectId: string,
  ownerId: string,
): Prisma.ProjectWhereInput {
  return { id: projectId, ownerId };
}

export function ownedTaskWhere(
  taskId: string,
  ownerId: string,
): Prisma.TaskWhereInput {
  return { id: taskId, project: { ownerId } };
}

export function ownedTaskListWhere(
  ownerId: string,
  projectId: string | null,
): Prisma.TaskWhereInput {
  return {
    ...(projectId ? { projectId } : {}),
    project: { ownerId },
  };
}
