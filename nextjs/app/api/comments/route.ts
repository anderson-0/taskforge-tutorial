import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { canMutate, ownedTaskWhere } from "@/lib/access-control";

const commentSchema = z.object({
  content: z.string().min(1),
  taskId: z.string(),
});

const authorInclude = {
  author: {
    select: { id: true, name: true, email: true },
  },
} as const;

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
    const { content, taskId } = commentSchema.parse(body);

    const task = await prisma.task.findFirst({
      where: ownedTaskWhere(taskId, session.user.id),
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId,
        authorId: session.user.id,
      },
      include: authorInclude,
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    logger.error({ error }, "Failed to create comment");

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
