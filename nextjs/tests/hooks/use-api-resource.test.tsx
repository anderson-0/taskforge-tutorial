import { act, renderHook, waitFor } from "@testing-library/react";
import { useApiResource } from "@/hooks/use-api-resource";
import { logger } from "@/lib/logger";

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}));

type Project = {
  id: string;
  name: string;
};

const firstProject: Project = { id: "project-1", name: "First" };
const updatedProject: Project = { id: "project-1", name: "Updated" };
const originalFetch = globalThis.fetch;
const waitOptions = { timeout: 5_000 };

function responseWith(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("loads a resource and can refresh it", async () => {
    const fetchMock = jest.mocked(globalThis.fetch);
    fetchMock
      .mockResolvedValueOnce(responseWith(firstProject))
      .mockResolvedValueOnce(responseWith(updatedProject));

    const { result } = renderHook(() =>
      useApiResource<Project>("/api/projects/project-1"),
    );

    await waitFor(
      () => expect(result.current.isLoading).toBe(false),
      waitOptions,
    );
    expect(result.current.data).toEqual(firstProject);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toEqual(updatedProject);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("settles with no data when the response is not successful", async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue(responseWith(null, false));

    const { result } = renderHook(() =>
      useApiResource<Project>("/api/projects/missing"),
    );

    await waitFor(
      () => expect(result.current.isLoading).toBe(false),
      waitOptions,
    );
    expect(result.current.data).toBeNull();
  });

  it("reports an initial request failure and stops loading", async () => {
    const error = new Error("network unavailable");
    jest.mocked(globalThis.fetch).mockRejectedValue(error);

    const { result } = renderHook(() =>
      useApiResource<Project>("/api/projects/project-1"),
    );

    await waitFor(
      () => expect(result.current.isLoading).toBe(false),
      waitOptions,
    );
    expect(logger.error).toHaveBeenCalledWith(
      { error, url: "/api/projects/project-1" },
      "Failed to load API resource",
    );
  });

  it("keeps existing data when a refresh fails", async () => {
    const error = new Error("refresh failed");
    const fetchMock = jest.mocked(globalThis.fetch);
    fetchMock
      .mockResolvedValueOnce(responseWith(firstProject))
      .mockRejectedValueOnce(error);

    const { result } = renderHook(() =>
      useApiResource<Project>("/api/projects/project-1"),
    );
    await waitFor(
      () => expect(result.current.data).toEqual(firstProject),
      waitOptions,
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toEqual(firstProject);
    expect(logger.error).toHaveBeenCalledWith(
      { error, url: "/api/projects/project-1" },
      "Failed to refresh API resource",
    );
  });

  it("ignores a response that settles after unmount", async () => {
    let resolveRequest: (response: Response) => void = () => undefined;
    const request = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    jest.mocked(globalThis.fetch).mockReturnValue(request);

    const { unmount } = renderHook(() =>
      useApiResource<Project>("/api/projects/project-1"),
    );
    unmount();

    await act(async () => {
      resolveRequest(responseWith(firstProject));
      await request;
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
