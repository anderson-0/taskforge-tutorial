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

jest.mock("@/hooks/use-api-resource", () => ({
  useApiResource: (url: string) => mockUseApiResource(url),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}));

jest.mock("@/components/project-list", () => ({
  ProjectList: ({ projects }: { projects: Array<{ id: string; name: string }> }) => (
    <div data-testid="project-list">
      {projects.map((project) => <span key={project.id}>{project.name}</span>)}
      <span>Count: {projects.length}</span>
    </div>
  ),
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogHeader: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

import ProjectsPage from "@/app/projects/page";

const originalFetch = globalThis.fetch;

async function submitProject(): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Project Name"), "Compiler");
  await user.type(screen.getByLabelText("Description"), "Build a compiler");
  await user.click(screen.getByRole("button", { name: "Create Project" }));
}

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn();
    mockRefresh.mockResolvedValue();
    mockUseApiResource.mockReturnValue({
      data: [],
      isLoading: false,
      refresh: mockRefresh,
    });
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("shows the loading state while projects load", () => {
    mockUseApiResource.mockReturnValue({
      data: null,
      isLoading: true,
      refresh: mockRefresh,
    });

    render(<ProjectsPage />);

    expect(screen.getByText("Loading projects...")).toBeInTheDocument();
    expect(mockUseApiResource).toHaveBeenCalledWith("/api/projects");
  });

  it("renders loaded projects and treats missing data as an empty list", () => {
    mockUseApiResource.mockReturnValue({
      data: [{ id: "project-1", name: "Analytical Engine" }],
      isLoading: false,
      refresh: mockRefresh,
    });
    const { rerender } = render(<ProjectsPage />);

    expect(screen.getByText("Analytical Engine")).toBeInTheDocument();

    mockUseApiResource.mockReturnValue({
      data: null,
      isLoading: false,
      refresh: mockRefresh,
    });
    rerender(<ProjectsPage />);
    expect(screen.getByText("Count: 0")).toBeInTheDocument();
  });

  it("posts a project, reports progress, and refreshes after success", async () => {
    let resolveFetch: (response: Response) => void = () => undefined;
    jest.mocked(globalThis.fetch).mockReturnValue(new Promise((resolve) => {
      resolveFetch = resolve;
    }));
    render(<ProjectsPage />);

    await submitProject();
    expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
    resolveFetch(new Response(null, { status: 201 }));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Compiler",
        description: "Build a compiler",
      }),
    });
  });

  it("does not refresh after an unsuccessful response", async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue(
      new Response(null, { status: 400 }),
    );
    render(<ProjectsPage />);

    await submitProject();

    expect(mockRefresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Create Project" }))
      .toBeEnabled();
  });

  it("logs request failures and restores the form", async () => {
    const error = new Error("network unavailable");
    jest.mocked(globalThis.fetch).mockRejectedValue(error);
    render(<ProjectsPage />);

    await submitProject();

    expect(logger.error).toHaveBeenCalledWith(
      { error },
      "Failed to create project",
    );
    expect(screen.getByRole("button", { name: "Create Project" }))
      .toBeEnabled();
  });
