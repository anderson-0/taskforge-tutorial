import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle, Clock, Folder } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardTask = {
  id: string;
  title: string;
  status: string;
  projectId: string;
  project: { name: string };
  assignee: { name: string } | null;
};

type DashboardStats = {
  totalProjects: number;
  todoTasks: number;
  inProgressTasks: number;
  doneTasks: number;
};

const statusClasses: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  DONE: "bg-green-100 text-green-800",
};

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ task }: { task: DashboardTask }) {
  return (
    <Link
      href={`/projects/${task.projectId}/tasks/${task.id}`}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
    >
      <div className="flex-1">
        <p className="font-medium">{task.title}</p>
        <p className="text-sm text-muted-foreground">
          {task.project.name} • {task.assignee?.name || "Unassigned"}
        </p>
      </div>
      <span
        className={`text-xs px-2 py-1 rounded-full ${statusClasses[task.status]}`}
      >
        {task.status.replace("_", " ")}
      </span>
    </Link>
  );
}

function RecentActivity({ tasks }: { tasks: DashboardTask[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No recent activity. Create a project to get started!
          </p>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => <ActivityItem key={task.id} task={task} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Dashboard({
  name,
  stats,
  tasks,
}: {
  name: string | null | undefined;
  stats: DashboardStats;
  tasks: DashboardTask[];
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {name}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Projects" value={stats.totalProjects} icon={<Folder className="h-4 w-4 text-muted-foreground" />} />
        <StatCard label="To Do" value={stats.todoTasks} icon={<Circle className="h-4 w-4 text-muted-foreground" />} />
        <StatCard label="In Progress" value={stats.inProgressTasks} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
        <StatCard label="Completed" value={stats.doneTasks} icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} />
      </div>
      <RecentActivity tasks={tasks} />
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const userId = session.user.id;
  const [projects, allTasks] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      include: { tasks: true },
    }),
    prisma.task.findMany({
      where: { project: { ownerId: userId } },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);
  const stats = {
    totalProjects: projects.length,
    todoTasks: allTasks.filter((task) => task.status === "TODO").length,
    inProgressTasks: allTasks.filter((task) => task.status === "IN_PROGRESS").length,
    doneTasks: allTasks.filter((task) => task.status === "DONE").length,
  };
  return <Dashboard name={session.user.name} stats={stats} tasks={allTasks} />;
}
