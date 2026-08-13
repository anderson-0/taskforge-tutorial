import {
  canMutate,
  ownedProjectWhere,
  ownedTaskListWhere,
  ownedTaskWhere,
} from "@/lib/access-control";

describe("owner-scoped database filters", () => {
  it("scopes a project id to its owner", () => {
    expect(ownedProjectWhere("project-1", "user-1")).toEqual({
      id: "project-1",
      ownerId: "user-1",
    });
  });

  it("scopes a task id through its project owner", () => {
    expect(ownedTaskWhere("task-1", "user-1")).toEqual({
      id: "task-1",
      project: { ownerId: "user-1" },
    });
  });

  it("scopes a task list to both project id and owner", () => {
    expect(ownedTaskListWhere("user-1", "project-1")).toEqual({
      projectId: "project-1",
      project: { ownerId: "user-1" },
    });
  });

  it("scopes an unfiltered task list to its owner", () => {
    expect(ownedTaskListWhere("user-1", null)).toEqual({
      project: { ownerId: "user-1" },
    });
  });
});

describe("role mutation policy", () => {
  it.each(["ADMIN", "MEMBER"])("allows %s mutations", (role) => {
    expect(canMutate(role)).toBe(true);
  });

  it.each(["VIEWER", "UNKNOWN", undefined])(
    "rejects %s mutations",
    (role) => {
      expect(canMutate(role)).toBe(false);
    },
  );
});
