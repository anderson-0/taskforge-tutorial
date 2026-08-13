"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import type { Project, Task, User } from "@prisma/client";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TaskBoard } from "@/components/task-board";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";
import { useApiResource } from "@/hooks/use-api-resource";

type ProjectDetails = Project & {
  tasks: Array<Task & { assignee: Pick<User, "id" | "name" | "email"> | null }>;
};

async function postTask(form: HTMLFormElement, projectId: string) {
  const formData = new FormData(form);
  return fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      priority: formData.get("priority") as string,
      projectId,
    }),
  });
}

function TaskForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Task Title</Label>
        <Input id="title" name="title" placeholder="Task title..." required disabled={isSubmitting} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" placeholder="Task description..." disabled={isSubmitting} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select name="priority" defaultValue="MEDIUM">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating..." : "Create Task"}
      </Button>
    </form>
  );
}

function CreateTaskDialog({
  projectId,
  refresh,
}: {
  projectId: string;
  refresh: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    try {
      const response = await postTask(form, projectId);
      if (response.ok) {
        setIsOpen(false);
        await refresh();
        form.reset();
      }
    } catch (error) {
      logger.error({ error }, "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />New Task</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
        <TaskForm isSubmitting={isSubmitting} onSubmit={handleSubmit} />
      </DialogContent>
    </Dialog>
  );
}

function ProjectHeader({
  project,
  refresh,
}: {
  project: ProjectDetails;
  refresh: () => Promise<void>;
}) {
  return (
    <div>
      <Link href="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />Back to Projects
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
        </div>
        <CreateTaskDialog projectId={project.id} refresh={refresh} />
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: project, isLoading, refresh } = useApiResource<ProjectDetails>(
    `/api/projects/${params.id}`,
  );
  if (isLoading) {
    return <div className="text-center py-12">Loading project...</div>;
  }
  if (!project) {
    return <div className="text-center py-12">Project not found</div>;
  }
  return (
    <div className="space-y-6">
      <ProjectHeader project={project} refresh={refresh} />
      <TaskBoard tasks={project.tasks} projectId={params.id} />
    </div>
  );
}
