"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Comment, Project, Task, User } from "@/generated/prisma/client";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommentThread } from "@/components/comment-thread";
import { logger } from "@/lib/logger";
import { useApiResource } from "@/hooks/use-api-resource";

type TaskDetails = Task & {
  assignee: Pick<User, "id" | "name" | "email"> | null;
  project: Pick<Project, "id" | "name">;
  comments: Array<Comment & { author: Pick<User, "id" | "name" | "email"> }>;
};

type TaskFieldProps = {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled: boolean;
  onChange: (value: string) => void;
};

const statusOptions = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
];

const priorityOptions = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

function TaskField({ label, value, options, disabled, onChange }: TaskFieldProps) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function TaskDetailsCard({
  task,
  isUpdating,
  update,
}: {
  task: TaskDetails;
  isUpdating: boolean;
  update: (data: Record<string, string>) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Task Details</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <TaskField label="Status" value={task.status} options={statusOptions} disabled={isUpdating} onChange={(status) => void update({ status })} />
        <TaskField label="Priority" value={task.priority} options={priorityOptions} disabled={isUpdating} onChange={(priority) => void update({ priority })} />
        <Detail label="Assignee">{task.assignee?.name || "Unassigned"}</Detail>
        <Detail label="Created">{new Date(task.createdAt).toLocaleDateString()}</Detail>
        <Detail label="Updated">{new Date(task.updatedAt).toLocaleDateString()}</Detail>
      </CardContent>
    </Card>
  );
}

function TaskHeader({ title, projectName, projectId, onDelete }: {
  title: string;
  projectName: string;
  projectId: string;
  onDelete: () => Promise<void>;
}) {
  return (
    <div>
      <Link href={`/projects/${projectId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />Back to Project
      </Link>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-1">{projectName}</p>
        </div>
        <Button variant="destructive" size="icon" onClick={() => void onDelete()}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TaskBody({ task, taskId, refresh }: {
  task: TaskDetails;
  taskId: string;
  refresh: () => Promise<void>;
}) {
  return (
    <div className="md:col-span-2 space-y-6">
      <Card>
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{task.description || "No description provided"}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <CommentThread comments={task.comments} taskId={taskId} onCommentAdded={refresh} />
        </CardContent>
      </Card>
    </div>
  );
}

function useTaskActions(taskId: string, projectId: string, refresh: () => Promise<void>) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const update = async (data: Record<string, string>) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) await refresh();
    } catch (error) {
      logger.error({ error }, "Failed to update task");
    } finally {
      setIsUpdating(false);
    }
  };
  const remove = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (response.ok) router.replace(`/projects/${projectId}`);
    } catch (error) {
      logger.error({ error }, "Failed to delete task");
    }
  };
  return { isUpdating, update, remove };
}

export default function TaskDetailPage() {
  const params = useParams<{ id: string; taskId: string }>();
  const { data: task, isLoading, refresh } = useApiResource<TaskDetails>(
    `/api/tasks/${params.taskId}`,
  );
  const actions = useTaskActions(params.taskId, params.id, refresh);
  if (isLoading) return <div className="text-center py-12">Loading task...</div>;
  if (!task) return <div className="text-center py-12">Task not found</div>;
  return (
    <div className="space-y-6 max-w-4xl">
      <TaskHeader title={task.title} projectName={task.project.name} projectId={params.id} onDelete={actions.remove} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TaskBody task={task} taskId={params.taskId} refresh={refresh} />
        <div className="space-y-4">
          <TaskDetailsCard task={task} isUpdating={actions.isUpdating} update={actions.update} />
        </div>
      </div>
    </div>
  );
}
