import { PrismaClient } from "@prisma/client";
import { api } from "encore.dev/api";
import { verifyToken } from "../auth/jwt";
import { logAction } from "../audit/audit";
import { before } from "node:test";

const prisma = new PrismaClient();

type JwtPayload = {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
  iat: number;
  exp: number;
};

export enum TaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  OVERDUE = "OVERDUE",
}

export const createTask = api(
  {
    method: "POST",
    path: "/tasks",
    expose: true,
  },
  async ({
    title,
    description,
    workflowId,
    userId,
    deadline,
    dependencies,
    headers,
  }: {
    title: string;
    description?: string;
    workflowId: string;
    userId: string;
    deadline?: string; // ISO string từ client, ví dụ "2025-05-15T00:00:00Z"
    dependencies?: string[]; // Array of task IDs
    headers: { authorization: string };
  }) => {
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Missing or invalid Authorization header.");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token) as JwtPayload;

    if (decoded.role !== "PROJECTMANAGER") {
      throw new Error("Access denied: Requires PROJECTMANAGER role.");
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });
    if (!workflow) throw new Error("Workflow not found.");

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new Error("User not found.");

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: "PENDING",
        deadline: deadline ? new Date(deadline) : undefined,
        workflowId,
        userId,
        projectId: workflow.projectId,
        dependencies:
          dependencies && dependencies.filter((id) => id !== "").length > 0
            ? {
                connect: dependencies
                  .filter((id) => id !== "")
                  .map((id) => ({ id })),
              }
            : undefined,
      },
    });

    await logAction({
      userId,
      action: "CREATE",
      target: "task",
      targetId: task.id,
      data: task,
    });

    return { success: true, task };
  }
);

export const updateTask = api(
  {
    method: "PATCH",
    path: "/tasks/:id",
    expose: true,
  },
  async ({
    id,
    title,
    description,
    status,
    deadline,
    dependencies,
    headers,
  }: {
    id: string;
    title?: string;
    description?: string;
    status?: TaskStatus;
    deadline?: string;
    dependencies?: string[]; // Array of task IDs
    headers: { authorization: string };
  }) => {
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token) as JwtPayload;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        dependencies: true,
      },
    });

    if (!task) throw new Error("Task not found");

    if (
      status &&
      (status === "IN_PROGRESS" || status === "COMPLETED") &&
      task.dependencies.length > 0
    ) {
      const incompleteDeps = task.dependencies.filter(
        (dep) => dep.status !== "COMPLETED"
      );
      if (incompleteDeps.length > 0) {
        throw new Error("Cannot proceed: Some dependencies are not completed.");
      }
    }

    const oldTask = { ...task };

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        status,
        deadline: deadline ? new Date(deadline) : undefined,
        dependencies:
          dependencies && dependencies.filter((id) => id !== "").length > 0
            ? {
                set: dependencies
                  .filter((id) => id !== "")
                  .map((id) => ({ id })),
              }
            : undefined,
      },
    });
    console.log("decoded.userId", decoded.userId);

    await logAction({
      userId: decoded.userId,
      action: "UPDATE",
      target: "task",
      targetId: id,
      data: {
        before: oldTask,
        after: updatedTask,
      },
    });

    return { success: true, task: updatedTask };
  }
);

export const getTask = api(
  {
    method: "GET",
    path: "/tasks/:id",
    expose: true,
  },
  async ({ id }: { id: string }) => {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        dependencies: true,
      },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    return { success: true, task };
  }
);

export const getAllTasks = api(
  {
    method: "GET",
    path: "/tasks",
    expose: true,
  },
  async () => {
    const tasks = await prisma.task.findMany({
      include: {
        dependencies: true,
      },
    });

    return { success: true, tasks };
  }
);

export const getCurrentUserTasks = api(
  {
    method: "POST",
    path: "/tasks/my-tasks",
    expose: true,
  },
  async ({ headers }: { headers: { authorization: string } }) => {
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Missing or invalid Authorization header.");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token) as JwtPayload;

    const tasks = await prisma.task.findMany({
      where: {
        userId: decoded.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, tasks };
  }
);
