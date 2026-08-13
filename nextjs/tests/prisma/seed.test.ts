type UserRecord = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
};

type ProjectRecord = {
  id: string;
  name: string;
  description: string;
  status: string;
  ownerId: string;
};

type TaskRecord = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  projectId: string;
  assigneeId: string | null;
};

type CommentRecord = {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
};

type LabelRecord = {
  id: string;
  name: string;
  color: string;
  projectId: string;
};

type TaskLabelRecord = { taskId: string; labelId: string };

type UpsertInput<RecordType, WhereType> = {
  where: WhereType;
  update: Partial<RecordType>;
  create: RecordType;
};

type Delegate<RecordType, WhereType> = {
  upsert: (input: UpsertInput<RecordType, WhereType>) => Promise<RecordType>;
  deleteMany: () => Promise<{ count: number }>;
};

type SeedTransaction = {
  user: Delegate<UserRecord, { email: string }>;
  project: Delegate<ProjectRecord, { id: string }>;
  task: Delegate<TaskRecord, { id: string }>;
  comment: Delegate<CommentRecord, { id: string }>;
  label: Delegate<LabelRecord, { id: string }>;
  taskLabel: Delegate<TaskLabelRecord, {
    taskId_labelId: TaskLabelRecord;
  }>;
};

type SeedDependencies = {
  transaction: (
    operation: (database: SeedTransaction) => Promise<void>,
  ) => Promise<void>;
  hashPassword: (password: string, rounds: number) => Promise<string>;
  logger: {
    info: (...arguments_: unknown[]) => void;
    error: (...arguments_: unknown[]) => void;
  };
};

type SeedRunnerDependencies = SeedDependencies & {
  disconnect: () => Promise<void>;
};

type SeedModule = {
  seedDatabase?: (dependencies: SeedDependencies) => Promise<void>;
  runSeed?: (dependencies: SeedRunnerDependencies) => Promise<void>;
  isDirectExecution?: (moduleUrl: string, scriptPath: string | undefined) => boolean;
  startSeedIfDirect?: (
    moduleUrl: string,
    scriptPath: string | undefined,
    dependencies: SeedRunnerDependencies,
  ) => Promise<void> | undefined;
  runtimeSeedDependencies?: SeedRunnerDependencies;
};

type SeedStore = ReturnType<typeof createStore>;

type SeedFixtures = {
  users: UserRecord[];
  projects: ProjectRecord[];
  tasks: TaskRecord[];
  comments: CommentRecord[];
  labels: LabelRecord[];
  taskLabels: TaskLabelRecord[];
};

function createDelegate<RecordType, WhereType>(
  records: Map<string, RecordType>,
  whereKey: (where: WhereType) => string,
  recordKey: (record: RecordType) => string,
): Delegate<RecordType, WhereType> {
  return {
    upsert: async ({ where, update, create }) => {
      const existing = records.get(whereKey(where));
      const next = existing ? { ...existing, ...update } : create;
      records.set(recordKey(next), next);
      return next;
    },
    deleteMany: async () => {
      const count = records.size;
      records.clear();
      return { count };
    },
  };
}

function recordMap<RecordType>(
  records: RecordType[] | undefined,
  key: (record: RecordType) => string,
) {
  return new Map((records ?? []).map((record) => [key(record), record]));
}

function createStore(fixtures: Partial<SeedFixtures> = {}) {
  return {
    users: recordMap(fixtures.users, (user) => user.email),
    projects: recordMap(fixtures.projects, (project) => project.id),
    tasks: recordMap(fixtures.tasks, (task) => task.id),
    comments: recordMap(fixtures.comments, (comment) => comment.id),
    labels: recordMap(fixtures.labels, (label) => label.id),
    taskLabels: recordMap(
      fixtures.taskLabels,
      (taskLabel) => `${taskLabel.taskId}:${taskLabel.labelId}`,
    ),
  };
}

function createTransaction(store: SeedStore): SeedTransaction {
  return {
    user: createDelegate(store.users, (where) => where.email, (user) => user.email),
    project: createDelegate(store.projects, (where) => where.id, (project) => project.id),
    task: createDelegate(store.tasks, (where) => where.id, (task) => task.id),
    comment: createDelegate(store.comments, (where) => where.id, (comment) => comment.id),
    label: createDelegate(store.labels, (where) => where.id, (label) => label.id),
    taskLabel: createDelegate(
      store.taskLabels,
      ({ taskId_labelId }) => `${taskId_labelId.taskId}:${taskId_labelId.labelId}`,
      (taskLabel) => `${taskLabel.taskId}:${taskLabel.labelId}`,
    ),
  };
}

function createDependencies(store: SeedStore): SeedDependencies {
  const transaction = createTransaction(store);
  return {
    transaction: async (operation) => operation(transaction),
    hashPassword: async () => "hashed-password",
    logger: { info: jest.fn(), error: jest.fn() },
  };
}

const mockRuntimeStore = createStore();
const mockDisconnect = jest.fn<Promise<void>, []>(async () => undefined);

jest.mock("@prisma/client", () => ({
  PrismaClient: function PrismaClient() {
    const transaction = createTransaction(mockRuntimeStore);
    return {
      $transaction: (
        operation: (database: SeedTransaction) => Promise<void>,
      ) => operation(transaction),
      $disconnect: mockDisconnect,
    };
  },
}));

jest.mock("bcryptjs", () => ({
  hash: async () => "runtime-hashed-password",
}));

jest.mock("pino", () => ({
  __esModule: true,
  default: () => ({ info: jest.fn(), error: jest.fn() }),
}));

const learnerUser: UserRecord = {
  id: "learner-user",
  email: "learner@example.com",
  password: "learner-password",
  name: "Course Learner",
  role: "MEMBER",
};

const learnerProject: ProjectRecord = {
  id: "learner-project",
  name: "Learner project",
  description: "Work outside the tutorial sample",
  status: "ACTIVE",
  ownerId: learnerUser.id,
};

const learnerTask: TaskRecord = {
  id: "learner-task",
  title: "Keep my task",
  description: "Learner-authored work",
  status: "IN_PROGRESS",
  priority: "URGENT",
  projectId: learnerProject.id,
  assigneeId: learnerUser.id,
};

const learnerComment: CommentRecord = {
  id: "learner-comment",
  content: "Do not delete this comment",
  taskId: learnerTask.id,
  authorId: learnerUser.id,
};

const learnerLabel: LabelRecord = {
  id: "learner-label",
  name: "Learner label",
  color: "#123456",
  projectId: learnerProject.id,
};

const learnerTaskLabel: TaskLabelRecord = {
  taskId: learnerTask.id,
  labelId: learnerLabel.id,
};

const learnerFixtures: SeedFixtures = {
  users: [learnerUser],
  projects: [learnerProject],
  tasks: [learnerTask],
  comments: [learnerComment],
  labels: [learnerLabel],
  taskLabels: [learnerTaskLabel],
};

function storeCounts(store: SeedStore) {
  return {
    users: store.users.size,
    projects: store.projects.size,
    tasks: store.tasks.size,
    comments: store.comments.size,
    labels: store.labels.size,
    taskLabels: store.taskLabels.size,
  };
}

function expectLearnerGraph(store: SeedStore) {
  expect(store.users.get(learnerUser.email)).toEqual(learnerUser);
  expect(store.projects.get(learnerProject.id)).toEqual(learnerProject);
  expect(store.tasks.get(learnerTask.id)).toEqual(learnerTask);
  expect(store.comments.get(learnerComment.id)).toEqual(learnerComment);
  expect(store.labels.get(learnerLabel.id)).toEqual(learnerLabel);
  expect(store.taskLabels.get("learner-task:learner-label"))
    .toEqual(learnerTaskLabel);
}

  it("preserves unrelated learner work and stays idempotent", async () => {
    const store = createStore(learnerFixtures);
    const seedModule = await import("@/prisma/seed") as unknown as SeedModule;

    if (!seedModule.seedDatabase) {
      throw new Error("seedDatabase must expose dependency-injected behavior");
    }

    const dependencies = createDependencies(store);
    await seedModule.seedDatabase(dependencies);
    expectLearnerGraph(store);
    expect(storeCounts(store)).toEqual({
      users: 4,
      projects: 4,
      tasks: 9,
      comments: 5,
      labels: 4,
      taskLabels: 5,
    });

    await seedModule.seedDatabase(dependencies);

    expectLearnerGraph(store);
    expect(storeCounts(store)).toEqual({
      users: 4,
      projects: 4,
      tasks: 9,
      comments: 5,
      labels: 4,
      taskLabels: 5,
    });
  });

  it("reports a seed failure and still disconnects", async () => {
    const seedModule = await import("@/prisma/seed") as unknown as SeedModule;
    const error = new Error("database unavailable");
    const dependencies = createDependencies(createStore());
    const disconnect = jest.fn<Promise<void>, []>(async () => undefined);
    dependencies.hashPassword = async () => Promise.reject(error);

    if (!seedModule.runSeed) {
      throw new Error("runSeed must expose the seed lifecycle");
    }

    process.exitCode = undefined;
    await seedModule.runSeed({ ...dependencies, disconnect });

    expect(dependencies.logger.error).toHaveBeenCalledWith(
      { error },
      "Seed failed",
    );
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });

  it("distinguishes CLI execution from an imported module", async () => {
    const seedModule = await import("@/prisma/seed") as unknown as SeedModule;
    const scriptPath = "/workspace/prisma/seed.ts";

    if (!seedModule.isDirectExecution) {
      throw new Error("isDirectExecution must expose the entrypoint check");
    }

    expect(seedModule.isDirectExecution(
      "file:///workspace/prisma/seed.ts",
      scriptPath,
    )).toBe(true);
    expect(seedModule.isDirectExecution(
      "file:///workspace/prisma/seed.ts",
      "/workspace/tests/prisma/seed.test.ts",
    )).toBe(false);
    expect(seedModule.isDirectExecution(
      "file:///workspace/prisma/seed.ts",
      undefined,
    )).toBe(false);
  });

  it("runs the explicit CLI lifecycle only for direct execution", async () => {
    const seedModule = await import("@/prisma/seed") as unknown as SeedModule;
    const scriptPath = "/workspace/prisma/seed.ts";

    if (!seedModule.startSeedIfDirect || !seedModule.runtimeSeedDependencies) {
      throw new Error("the CLI seed contract must be exposed");
    }

    expect(seedModule.startSeedIfDirect(
      "file:///workspace/prisma/seed.ts",
      "/workspace/tests/prisma/seed.test.ts",
      seedModule.runtimeSeedDependencies,
    )).toBeUndefined();
    expect(mockDisconnect).not.toHaveBeenCalled();

    await seedModule.startSeedIfDirect(
      "file:///workspace/prisma/seed.ts",
      scriptPath,
      seedModule.runtimeSeedDependencies,
    );

    expect(mockRuntimeStore.users.size).toBe(3);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
