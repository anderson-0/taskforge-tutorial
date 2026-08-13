import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { logger } from "@/lib/logger";

type ResourceState = {
  data: unknown;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const mockUseApiResource = jest.fn<ResourceState, [string]>();
const mockRefresh = jest.fn<Promise<void>, []>();

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "project-1" }),
}));

jest.mock("@/hooks/use-api-resource", () => ({
  useApiResource: (url: string) => mockUseApiResource(url),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}));

jest.mock("@/components/task-board", () => ({
  TaskBoard: ({
    tasks,
    projectId,
  }: {
    tasks: Array<{ id: string }>;
    projectId: string;
  }) => <div>Task board {projectId}: {tasks.length}</div>,
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogHeader: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, name }: { children: ReactNode; name?: string }) => (
    <select aria-label="Priority" name={name} defaultValue="MEDIUM">
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

import ProjectDetailPage from "@/app/projects/[id]/page";

const originalFetch = globalThis.fetch;

const project = {
  id: "project-1",
  name: "Analytical Engine",
  description: "A programmable machine",
  tasks: [{ id: "task-1" }],
};

async function submitTask(): Promise<HTMLFormElement> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Task Title"), "Write program");
  await user.type(screen.getByLabelText("Description"), "Punch cards");
  await user.selectOptions(screen.getByLabelText("Priority"), "HIGH");
  const form = screen.getByRole("button", { name: "Create Task" }).closest("form");
  if (!form) throw new Error("task form missing");
  await user.click(screen.getByRole("button", { name: "Create Task" }));
  return form;
}

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn();
    mockRefresh.mockResolvedValue();
    mockUseApiResource.mockReturnValue({
      data: project,
      isLoading: false,
      refresh: mockRefresh,
    });
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("renders loading and missing-project states", () => {
    mockUseApiResource.mockReturnValue({
      data: null,
      isLoading: true,
      refresh: mockRefresh,
    });
    const { rerender } = render(<ProjectDetailPage />);
    expect(screen.getByText("Loading project...")).toBeInTheDocument();

    mockUseApiResource.mockReturnValue({
      data: null,
      isLoading: false,
      refresh: mockRefresh,
    });
    rerender(<ProjectDetailPage />);
    expect(screen.getByText("Project not found")).toBeInTheDocument();
  });

  it("renders project details, description, board, and Link navigation", () => {
    render(<ProjectDetailPage />);

    expect(screen.getByRole("heading", { name: "Analytical Engine" }))
      .toBeInTheDocument();
    expect(screen.getByText("A programmable machine")).toBeInTheDocument();
    expect(screen.getByText("Task board project-1: 1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Projects" }))
      .toHaveAttribute("href", "/projects");
    expect(mockUseApiResource).toHaveBeenCalledWith("/api/projects/project-1");
  });

  it("does not render an empty description", () => {
    mockUseApiResource.mockReturnValue({
      data: { ...project, description: "" },
      isLoading: false,
      refresh: mockRefresh,
    });
    render(<ProjectDetailPage />);

    expect(screen.queryByText("A programmable machine")).not.toBeInTheDocument();
  });

  it("posts a task, refreshes the project, and resets the form", async () => {
    let resolveFetch: (response: Response) => void = () => undefined;
    jest.mocked(globalThis.fetch).mockReturnValue(new Promise((resolve) => {
      resolveFetch = resolve;
    }));
    render(<ProjectDetailPage />);

    const form = await submitTask();
    const resetSpy = jest.spyOn(form, "reset");
    expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
    resolveFetch(new Response(null, { status: 201 }));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Write program",
        description: "Punch cards",
        priority: "HIGH",
        projectId: "project-1",
      }),
    });
  });

  it("does not refresh or reset after an unsuccessful response", async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue(
      new Response(null, { status: 400 }),
    );
    render(<ProjectDetailPage />);

    const form = await submitTask();
    const resetSpy = jest.spyOn(form, "reset");

    expect(mockRefresh).not.toHaveBeenCalled();
    expect(resetSpy).not.toHaveBeenCalled();
  });

  it("logs create failures and restores the form", async () => {
    const error = new Error("network unavailable");
    jest.mocked(globalThis.fetch).mockRejectedValue(error);
    render(<ProjectDetailPage />);

    await submitTask();

    expect(logger.error).toHaveBeenCalledWith(
      { error },
      "Failed to create task",
    );
    expect(screen.getByRole("button", { name: "Create Task" })).toBeEnabled();
  });
