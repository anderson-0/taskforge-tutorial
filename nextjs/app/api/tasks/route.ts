import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  canMutate,
  ownedProjectWhere,
  ownedTaskListWhere,
} from "@/lib/access-control";

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  projectId: z.string(),
  assigneeId: z.string().optional(),
});

const taskListInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true } },
  comments: {
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  },
} as const;

const createdTaskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true } },
} as const;

type TaskInput = z.infer<typeof taskSchema>;

async function relationError(data: TaskInput, ownerId: string) {
  const project = await prisma.project.findFirst({
    where: ownedProjectWhere(data.projectId, ownerId),
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const tasks = await prisma.task.findMany({
      where: ownedTaskListWhere(session.user.id, projectId),
      include: taskListInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    logger.error({ error }, "Failed to list tasks");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canMutate(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = taskSchema.parse(body);

    const invalidRelation = await relationError(data, session.user.id);
    if (invalidRelation) return invalidRelation;

    const task = await prisma.task.create({
      data,
      include: createdTaskInclude,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    logger.error({ error }, "Failed to create task");

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
