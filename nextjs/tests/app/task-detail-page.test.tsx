import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { logger } from "@/lib/logger";

type ResourceState = {
  data: unknown;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const mockUseApiResource = jest.fn<ResourceState, [string]>();
const mockRefresh = jest.fn<Promise<void>, []>();
const mockReplace = jest.fn<void, [string]>();

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "project-1", taskId: "task-1" }),
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@/hooks/use-api-resource", () => ({
  useApiResource: (url: string) => mockUseApiResource(url),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}));

jest.mock("@/components/comment-thread", () => ({
  CommentThread: ({
    comments,
    taskId,
    onCommentAdded,
  }: {
    comments: Array<{ id: string }>;
    taskId: string;
    onCommentAdded: () => Promise<void>;
  }) => (
    <div>
      Comments {taskId}: {comments.length}
      <button type="button" onClick={() => void onCommentAdded()}>
        Refresh comments
      </button>
    </div>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
    disabled,
  }: {
    children: ReactNode;
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select
      aria-label={value === "TODO" || value === "IN_PROGRESS" || value === "DONE"
        ? "Status"
        : "Priority"}
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
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

import TaskDetailPage from "@/app/projects/[id]/tasks/[taskId]/page";

const originalFetch = globalThis.fetch;
const originalConfirm = globalThis.confirm;

const task = {
  id: "task-1",
  title: "Write program",
  description: "Punch cards",
  status: "TODO",
  priority: "MEDIUM",
  createdAt: new Date("2026-01-02T00:00:00Z"),
  updatedAt: new Date("2026-01-03T00:00:00Z"),
  project: { id: "project-1", name: "Analytical Engine" },
  assignee: { id: "user-2", name: "Ada", email: "ada@example.com" },
  comments: [{ id: "comment-1" }],
};

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn();
    globalThis.confirm = jest.fn(() => true);
    mockRefresh.mockResolvedValue();
    mockUseApiResource.mockReturnValue({
      data: task,
      isLoading: false,
      refresh: mockRefresh,
    });
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    globalThis.confirm = originalConfirm;
  });

  it("renders loading and missing-task states", () => {
    mockUseApiResource.mockReturnValue({
      data: null,
      isLoading: true,
      refresh: mockRefresh,
    });
    const { rerender } = render(<TaskDetailPage />);
    expect(screen.getByText("Loading task...")).toBeInTheDocument();

    mockUseApiResource.mockReturnValue({
      data: null,
      isLoading: false,
      refresh: mockRefresh,
    });
    rerender(<TaskDetailPage />);
    expect(screen.getByText("Task not found")).toBeInTheDocument();
  });

  it("renders task data, comments, dates, and Link navigation", async () => {
    const user = userEvent.setup();
    render(<TaskDetailPage />);

    expect(screen.getByRole("heading", { name: "Write program" }))
      .toBeInTheDocument();
    expect(screen.getByText("Punch cards")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Comments task-1: 1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Project" }))
      .toHaveAttribute("href", "/projects/project-1");
    await user.click(screen.getByRole("button", { name: "Refresh comments" }));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockUseApiResource).toHaveBeenCalledWith("/api/tasks/task-1");
  });

  it("renders fallbacks for description and assignee", () => {
    mockUseApiResource.mockReturnValue({
      data: { ...task, description: "", assignee: null },
      isLoading: false,
      refresh: mockRefresh,
    });
    render(<TaskDetailPage />);

    expect(screen.getByText("No description provided")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it.each([
    ["Status", "DONE", { status: "DONE" }],
    ["Priority", "HIGH", { priority: "HIGH" }],
  ])("patches %s and refreshes after success", async (label, value, payload) => {
    let resolveFetch: (response: Response) => void = () => undefined;
    jest.mocked(globalThis.fetch).mockReturnValue(new Promise((resolve) => {
      resolveFetch = resolve;
    }));
    render(<TaskDetailPage />);

    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    expect(screen.getByLabelText("Status")).toBeDisabled();
    expect(screen.getByLabelText("Priority")).toBeDisabled();
    resolveFetch(new Response(null, { status: 200 }));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/tasks/task-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  });

  it.each([
    ["Status", "DONE"],
    ["Priority", "HIGH"],
  ])("does not refresh when the %s update is rejected", async (label, value) => {
    jest.mocked(globalThis.fetch).mockResolvedValue(
      new Response(null, { status: 400 }),
    );
    render(<TaskDetailPage />);

    fireEvent.change(screen.getByLabelText(label), { target: { value } });

    await waitFor(() => expect(screen.getByLabelText(label)).toBeEnabled());
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it.each([
    ["Status", "DONE", "Failed to update task"],
    ["Priority", "HIGH", "Failed to update task"],
  ])("logs a failed %s request", async (label, value, message) => {
    const error = new Error("network unavailable");
    jest.mocked(globalThis.fetch).mockRejectedValue(error);
    render(<TaskDetailPage />);

    fireEvent.change(screen.getByLabelText(label), { target: { value } });

    await waitFor(() =>
      expect(logger.error).toHaveBeenCalledWith({ error }, message),
    );
    expect(screen.getByLabelText(label)).toBeEnabled();
  });

  it("leaves the task untouched when deletion is cancelled", async () => {
    globalThis.confirm = jest.fn(() => false);
    const user = userEvent.setup();
    render(<TaskDetailPage />);

    await user.click(screen.getByRole("button", { name: "" }));

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("deletes a confirmed task and replaces the route after success", async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    const user = userEvent.setup();
    render(<TaskDetailPage />);

    await user.click(screen.getByRole("button", { name: "" }));

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/tasks/task-1", {
      method: "DELETE",
    });
    expect(mockReplace).toHaveBeenCalledWith("/projects/project-1");
  });

  it("does not navigate when deletion is rejected", async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue(
      new Response(null, { status: 400 }),
    );
    const user = userEvent.setup();
    render(<TaskDetailPage />);

    await user.click(screen.getByRole("button", { name: "" }));

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("logs deletion failures", async () => {
    const error = new Error("network unavailable");
    jest.mocked(globalThis.fetch).mockRejectedValue(error);
    const user = userEvent.setup();
    render(<TaskDetailPage />);

    await user.click(screen.getByRole("button", { name: "" }));

    expect(logger.error).toHaveBeenCalledWith(
      { error },
      "Failed to delete task",
    );
  });
