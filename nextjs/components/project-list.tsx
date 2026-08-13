"use client";

import type { Project, Task, User } from "@/generated/prisma/client";
import { Archive, Folder } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProjectSummary = Project & {
  tasks: Task[];
  owner: Pick<User, "id" | "name" | "email">;
};

function taskCount(tasks: Task[], status: string): number {
  return tasks.filter((task) => task.status === status).length;
}

function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {project.status === "ARCHIVED" ? (
                <Archive className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Folder className="h-5 w-5 text-primary" />
              )}
              <CardTitle className="text-lg">{project.name}</CardTitle>
            </div>
          </div>
          {project.description && (
            <CardDescription className="line-clamp-2">
              {project.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm">
            <div><span className="text-muted-foreground">To Do: </span><span className="font-medium">{taskCount(project.tasks, "TODO")}</span></div>
            <div><span className="text-muted-foreground">Progress: </span><span className="font-medium">{taskCount(project.tasks, "IN_PROGRESS")}</span></div>
            <div><span className="text-muted-foreground">Done: </span><span className="font-medium">{taskCount(project.tasks, "DONE")}</span></div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
        <p className="text-muted-foreground">Create your first project to get started</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => <ProjectCard key={project.id} project={project} />)}
    </div>
  );
}
