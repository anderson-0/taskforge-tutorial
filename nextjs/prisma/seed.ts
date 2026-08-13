import type { Prisma } from "../generated/prisma/client";
import bcrypt from "bcryptjs";
import pino from "pino";
import { pathToFileURL } from "node:url";
import { prisma } from "../lib/db";

type UserKey = "alice" | "bob" | "charlie";

type UserSeed = {
  key: UserKey;
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
};

type TaskSeed = {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  projectId: string;
  assignee?: UserKey;
};

type SeedLogger = {
  info(message: string): void;
  info(counts: Record<string, number>, message: string): void;
  error(context: { error: unknown }, message: string): void;
};

export type SeedDependencies = {
  transaction: (
    operation: (database: Prisma.TransactionClient) => Promise<void>,
  ) => Promise<void>;
  hashPassword: (password: string, rounds: number) => Promise<string>;
  logger: SeedLogger;
};

export type SeedRunnerDependencies = SeedDependencies & {
  disconnect: () => Promise<void>;
};

const logger = pino({ level: "info" });

const projectIds = {
  development: "seed-project-development",
  marketing: "seed-project-marketing",
  migration: "seed-project-migration",
} as const;

const taskIds = {
  auth: "seed-task-auth",
  schema: "seed-task-schema",
  board: "seed-task-board",
  comments: "seed-task-comments",
  archive: "seed-task-archive",
  social: "seed-task-social",
  email: "seed-task-email",
  analytics: "seed-task-analytics",
} as const;

const labelIds = {
  bug: "seed-label-bug",
  feature: "seed-label-feature",
  urgent: "seed-label-urgent",
} as const;

const userSeeds: readonly UserSeed[] = [
  {
    key: "alice",
    id: "seed-user-alice",
    email: "alice@example.com",
    name: "Alice Johnson",
    role: "ADMIN",
  },
  {
    key: "bob",
    id: "seed-user-bob",
    email: "bob@example.com",
    name: "Bob Smith",
    role: "MEMBER",
  },
  {
    key: "charlie",
    id: "seed-user-charlie",
    email: "charlie@example.com",
    name: "Charlie Davis",
    role: "VIEWER",
  },
];

const taskSeeds: readonly TaskSeed[] = [
  {
    id: taskIds.auth,
    title: "Setup authentication system",
    description: "Implement NextAuth.js with credentials provider",
    status: "DONE",
    priority: "HIGH",
    projectId: projectIds.development,
    assignee: "alice",
  },
  {
    id: taskIds.schema,
    title: "Design database schema",
    description: "Create Prisma schema for all models",
    status: "DONE",
    priority: "URGENT",
    projectId: projectIds.development,
    assignee: "alice",
  },
  {
    id: taskIds.board,
    title: "Build task board UI",
    description: "Create Kanban board with drag and drop",
    status: "IN_PROGRESS",
    priority: "HIGH",
    projectId: projectIds.development,
    assignee: "bob",
  },
  {
    id: taskIds.comments,
    title: "Add comment functionality",
    description: "Allow users to comment on tasks",
    status: "TODO",
    priority: "MEDIUM",
    projectId: projectIds.development,
    assignee: "bob",
  },
  {
    id: taskIds.archive,
    title: "Implement project archiving",
    description: "Add ability to archive completed projects",
    status: "TODO",
    priority: "LOW",
    projectId: projectIds.development,
  },
  {
    id: taskIds.social,
    title: "Social media strategy",
    description: "Develop comprehensive social media plan",
    status: "IN_PROGRESS",
    priority: "HIGH",
    projectId: projectIds.marketing,
    assignee: "bob",
  },
  {
    id: taskIds.email,
    title: "Email campaign design",
    description: "Create email templates for campaign",
    status: "TODO",
    priority: "MEDIUM",
    projectId: projectIds.marketing,
  },
  {
    id: taskIds.analytics,
    title: "Analytics dashboard setup",
    description: "Configure tracking and analytics",
    status: "TODO",
    priority: "MEDIUM",
    projectId: projectIds.marketing,
    assignee: "charlie",
  },
];

async function seedUsers(db: Prisma.TransactionClient, password: string) {
  const users = await Promise.all(
    userSeeds.map((seed) =>
      db.user.upsert({
        where: { email: seed.email },
        update: { name: seed.name, password, role: seed.role },
        create: {
          id: seed.id,
          email: seed.email,
          name: seed.name,
          role: seed.role,
          password,
        },
      }),
    ),
  );

  return {
    alice: users[0].id,
    bob: users[1].id,
    charlie: users[2].id,
  } satisfies Record<UserKey, string>;
}

async function seedProjects(
  db: Prisma.TransactionClient,
  users: Record<UserKey, string>,
) {
  const projects = [
      {
        id: projectIds.development,
        name: "TaskForge Development",
        description: "Build the next generation project management tool",
        status: "ACTIVE",
        ownerId: users.alice,
      },
      {
        id: projectIds.marketing,
        name: "Marketing Campaign",
        description: "Q1 marketing initiatives",
        status: "ACTIVE",
        ownerId: users.alice,
      },
      {
        id: projectIds.migration,
        name: "Legacy System Migration",
        description: "Migrate old infrastructure to cloud",
        status: "ARCHIVED",
        ownerId: users.alice,
      },
    ];

  await Promise.all(
    projects.map(({ id, ...data }) =>
      db.project.upsert({ where: { id }, update: data, create: { id, ...data } }),
    ),
  );
}

async function seedTasks(
  db: Prisma.TransactionClient,
  users: Record<UserKey, string>,
) {
  const tasks = taskSeeds.map((seed) => ({
      id: seed.id,
      title: seed.title,
      description: seed.description,
      status: seed.status,
      priority: seed.priority,
      projectId: seed.projectId,
      assigneeId: seed.assignee ? users[seed.assignee] : null,
    }));

  await Promise.all(
    tasks.map(({ id, ...data }) =>
      db.task.upsert({ where: { id }, update: data, create: { id, ...data } }),
    ),
  );
}

async function seedComments(
  db: Prisma.TransactionClient,
  users: Record<UserKey, string>,
) {
  const comments = [
    { id: "seed-comment-auth-review", content: "Great work on the authentication! Testing it now.", taskId: taskIds.auth, authorId: users.bob },
    { id: "seed-comment-auth-reply", content: "Thanks! Let me know if you find any issues.", taskId: taskIds.auth, authorId: users.alice },
    { id: "seed-comment-board", content: "The Kanban board is coming along nicely.", taskId: taskIds.board, authorId: users.bob },
    { id: "seed-comment-social", content: "Prioritize the social media content calendar.", taskId: taskIds.social, authorId: users.alice },
  ];

  await Promise.all(
    comments.map(({ id, ...data }) =>
      db.comment.upsert({ where: { id }, update: data, create: { id, ...data } }),
    ),
  );
}

async function seedLabels(db: Prisma.TransactionClient) {
  const labels = [
    { id: labelIds.bug, name: "Bug", color: "#ef4444", projectId: projectIds.development },
    { id: labelIds.feature, name: "Feature", color: "#3b82f6", projectId: projectIds.development },
    { id: labelIds.urgent, name: "Urgent", color: "#f97316", projectId: projectIds.marketing },
  ];

  await Promise.all(
    labels.map(({ id, ...data }) =>
      db.label.upsert({ where: { id }, update: data, create: { id, ...data } }),
    ),
  );
}

async function seedTaskLabels(db: Prisma.TransactionClient) {
  const taskLabels = [
      { taskId: taskIds.auth, labelId: labelIds.feature },
      { taskId: taskIds.schema, labelId: labelIds.feature },
      { taskId: taskIds.board, labelId: labelIds.feature },
      { taskId: taskIds.social, labelId: labelIds.urgent },
    ];

  await Promise.all(
    taskLabels.map((data) =>
      db.taskLabel.upsert({
        where: { taskId_labelId: data },
        update: {},
        create: data,
      }),
    ),
  );
}

export async function seedDatabase(dependencies: SeedDependencies) {
  dependencies.logger.info("Starting deterministic development seed");
  const password = await dependencies.hashPassword("password123", 12);

  await dependencies.transaction(async (db) => {
    const users = await seedUsers(db, password);
    await seedProjects(db, users);
    await seedTasks(db, users);
    await seedComments(db, users);
    await seedLabels(db);
    await seedTaskLabels(db);
  });

  dependencies.logger.info(
    { users: 3, projects: 3, tasks: 8, comments: 4, labels: 3 },
    "Development seed completed",
  );
}

export async function runSeed(dependencies: SeedRunnerDependencies) {
  try {
    await seedDatabase(dependencies);
  } catch (error) {
    dependencies.logger.error({ error }, "Seed failed");
    process.exitCode = 1;
  } finally {
    await dependencies.disconnect();
  }
}

export function isDirectExecution(
  moduleUrl: string,
  scriptPath: string | undefined,
) {
  return Boolean(scriptPath && pathToFileURL(scriptPath).href === moduleUrl);
}

export function startSeedIfDirect(
  moduleUrl: string,
  scriptPath: string | undefined,
  dependencies: SeedRunnerDependencies,
) {
  if (!isDirectExecution(moduleUrl, scriptPath)) return undefined;
  return runSeed(dependencies);
}

export const runtimeSeedDependencies: SeedRunnerDependencies = {
  transaction: async (operation) => prisma.$transaction(operation),
  hashPassword: bcrypt.hash,
  logger,
  disconnect: async () => prisma.$disconnect(),
};

void startSeedIfDirect(
  import.meta.url,
  process.argv[1],
  runtimeSeedDependencies,
);
