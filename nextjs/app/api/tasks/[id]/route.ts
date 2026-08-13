import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { canMutate, ownedTaskWhere } from "@/lib/access-control";

const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().nullable().optional(),
});

const taskDetailsInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true } },
  comments: {
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  },
} as const;

const updatedTaskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true } },
} as const;

type TaskUpdate = z.infer<typeof taskUpdateSchema>;

async function updateRelationError(id: string, ownerId: string, data: TaskUpdate) {
  const task = await prisma.task.findFirst({
    where: ownedTaskWhere(id, ownerId),
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (!data.assigneeId) return null;
  const assignee = await prisma.user.findUnique({
    where: { id: data.assigneeId },
    select: { id: true },
  });
  return assignee
    ? null
    : NextResponse.json({ error: "Assignee not found" }, { status: 404 });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.task.findFirst({
      where: ownedTaskWhere(id, session.user.id),
      include: taskDetailsInclude,
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    logger.error({ error }, "Failed to get task");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canMutate(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = taskUpdateSchema.parse(body);

    const invalidRelation = await updateRelationError(id, session.user.id, data);
    if (invalidRelation) return invalidRelation;

    const updatedTask = await prisma.task.update({
      where: { id },
      data,
      include: updatedTaskInclude,
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    logger.error({ error }, "Failed to update task");

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canMutate(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const task = await prisma.task.findFirst({
      where: ownedTaskWhere(id, session.user.id),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to delete task");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
