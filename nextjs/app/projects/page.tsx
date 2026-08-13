"use client";

import { useState } from "react";
import type { Project, Task, User } from "@/generated/prisma/client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectList } from "@/components/project-list";
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
import { logger } from "@/lib/logger";
import { useApiResource } from "@/hooks/use-api-resource";

type ProjectSummary = Project & {
  tasks: Task[];
  owner: Pick<User, "id" | "name" | "email">;
};

async function postProject(form: HTMLFormElement): Promise<Response> {
  const formData = new FormData(form);
  return fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    }),
  });
}

function ProjectForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Project Name</Label>
        <Input id="name" name="name" placeholder="My Awesome Project" required disabled={isSubmitting} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" placeholder="Project description..." disabled={isSubmitting} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating..." : "Create Project"}
      </Button>
    </form>
  );
}

function CreateProjectDialog({ refresh }: { refresh: () => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await postProject(event.currentTarget);
      if (response.ok) {
        setIsOpen(false);
        await refresh();
      }
    } catch (error) {
      logger.error({ error }, "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />New Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create New Project</DialogTitle></DialogHeader>
        <ProjectForm isSubmitting={isSubmitting} onSubmit={handleSubmit} />
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectsPage() {
  const { data, isLoading, refresh } = useApiResource<ProjectSummary[]>(
    "/api/projects",
  );
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your projects</p>
        </div>
        <CreateProjectDialog refresh={refresh} />
      </div>
      {isLoading ? (
        <div className="text-center py-12">Loading projects...</div>
      ) : (
        <ProjectList projects={data ?? []} />
      )}
    </div>
  );
}
