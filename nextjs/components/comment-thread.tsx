"use client";

import { useState } from "react";
import type { Comment, User } from "@/generated/prisma/client";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

type CommentWithAuthor = Comment & {
  author: Pick<User, "id" | "name" | "email">;
};

function useCommentDraft(taskId: string, onCommentAdded: () => void) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment, taskId }),
      });
      if (response.ok) {
        setNewComment("");
        onCommentAdded();
      }
    } catch (error) {
      logger.error({ error }, "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };
  return { newComment, setNewComment, isSubmitting, submit };
}

function CommentForm({ draft }: {
  draft: ReturnType<typeof useCommentDraft>;
}) {
  return (
    <form onSubmit={draft.submit} className="space-y-2">
      <Textarea
        placeholder="Add a comment..."
        value={draft.newComment}
        onChange={(event) => draft.setNewComment(event.target.value)}
        disabled={draft.isSubmitting}
      />
      <Button type="submit" disabled={draft.isSubmitting || !draft.newComment.trim()}>
        {draft.isSubmitting ? "Adding..." : "Add Comment"}
      </Button>
    </form>
  );
}

function Comments({ comments }: { comments: CommentWithAuthor[] }) {
  if (comments.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">No comments yet. Be the first to comment!</div>;
  }
  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <Card key={comment.id}>
          <CardContent className="pt-4">
            <div className="flex justify-between items-start mb-2">
              <span className="font-medium text-sm">{comment.author.name}</span>
              <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm">{comment.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CommentThread({ comments, taskId, onCommentAdded }: {
  comments: CommentWithAuthor[];
  taskId: string;
  onCommentAdded: () => void;
}) {
  const draft = useCommentDraft(taskId, onCommentAdded);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />Comments ({comments.length})
      </h3>
      <CommentForm draft={draft} />
      <Comments comments={comments} />
    </div>
  );
}
