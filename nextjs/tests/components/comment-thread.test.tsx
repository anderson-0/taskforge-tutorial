import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Comment, User } from "@prisma/client";

const mockLoggerError = jest.fn<void, [unknown, string]>();

jest.mock("@/lib/logger", () => ({
  logger: {
    error: (context: unknown, message: string) =>
      mockLoggerError(context, message),
  },
}));

import { CommentThread } from "@/components/comment-thread";

type CommentWithAuthor = Comment & {
  author: Pick<User, "id" | "name" | "email">;
};

const originalFetch = globalThis.fetch;

function responseWith(ok: boolean): Response {
  return { ok } as Response;
}

const comment: CommentWithAuthor = {
  id: "comment-1",
  content: "The API contract is ready.",
  taskId: "task-1",
  authorId: "user-1",
  createdAt: new Date("2025-01-15T12:00:00.000Z"),
  updatedAt: new Date("2025-01-15T12:00:00.000Z"),
  author: {
    id: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
  },
};

  beforeEach(() => {
    globalThis.fetch = jest.fn();
    jest.clearAllMocks();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("renders existing comments with author, date, and content", () => {
    render(
      <CommentThread
        comments={[comment]}
        taskId="task-1"
        onCommentAdded={jest.fn()}
      />,
    );

    expect(screen.getByText("Comments (1)")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText(comment.createdAt.toLocaleString()))
      .toBeInTheDocument();
    expect(screen.getByText("The API contract is ready.")).toBeInTheDocument();
    expect(screen.queryByText(/No comments yet/)).not.toBeInTheDocument();
  });

  it("shows the empty state and ignores a whitespace-only submission", () => {
    const onCommentAdded = jest.fn();
    const { container } = render(
      <CommentThread
        comments={[]}
        taskId="task-1"
        onCommentAdded={onCommentAdded}
      />,
    );

    expect(screen.getByText("Comments (0)")).toBeInTheDocument();
    expect(screen.getByText(/No comments yet/)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Add a comment..."), {
      target: { value: "   " },
    });
    fireEvent.submit(container.querySelector("form")!);

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(onCommentAdded).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add Comment" }))
      .toBeDisabled();
  });

  it("posts a comment, exposes the pending state, and clears on success", async () => {
    const user = userEvent.setup();
    const onCommentAdded = jest.fn();
    let resolveRequest: (response: Response) => void = () => undefined;
    const request = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    jest.mocked(globalThis.fetch).mockReturnValue(request);

    render(
      <CommentThread
        comments={[]}
        taskId="task-1"
        onCommentAdded={onCommentAdded}
      />,
    );

    const textbox = screen.getByPlaceholderText("Add a comment...");
    await user.type(textbox, "Ship the release");
    await user.click(screen.getByRole("button", { name: "Add Comment" }));

    expect(screen.getByRole("button", { name: "Adding..." })).toBeDisabled();
    expect(textbox).toBeDisabled();
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Ship the release",
        taskId: "task-1",
      }),
    });

    resolveRequest(responseWith(true));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add Comment" }))
        .toBeDisabled();
    });
    expect(textbox).toHaveValue("");
    expect(textbox).toBeEnabled();
    expect(onCommentAdded).toHaveBeenCalledTimes(1);
  });

  it("retains the draft when the server rejects the request", async () => {
    const user = userEvent.setup();
    const onCommentAdded = jest.fn();
    jest.mocked(globalThis.fetch).mockResolvedValue(responseWith(false));

    render(
      <CommentThread
        comments={[]}
        taskId="task-1"
        onCommentAdded={onCommentAdded}
      />,
    );

    const textbox = screen.getByPlaceholderText("Add a comment...");
    await user.type(textbox, "Keep this draft");
    await user.click(screen.getByRole("button", { name: "Add Comment" }));

    await waitFor(() => expect(textbox).toBeEnabled());
    expect(textbox).toHaveValue("Keep this draft");
    expect(onCommentAdded).not.toHaveBeenCalled();
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it("logs a network failure and restores the form", async () => {
    const user = userEvent.setup();
    const error = new Error("network unavailable");
    jest.mocked(globalThis.fetch).mockRejectedValue(error);

    render(
      <CommentThread
        comments={[]}
        taskId="task-1"
        onCommentAdded={jest.fn()}
      />,
    );

    const textbox = screen.getByPlaceholderText("Add a comment...");
    await user.type(textbox, "Retry me");
    await user.click(screen.getByRole("button", { name: "Add Comment" }));

    await waitFor(() => expect(textbox).toBeEnabled());
    expect(mockLoggerError).toHaveBeenCalledWith(
      { error },
      "Failed to add comment",
    );
    expect(textbox).toHaveValue("Retry me");
  });
