import { PrismaClient } from "@prisma/client";
import { api } from "encore.dev/api";
import { verifyToken } from "../auth/jwt";

const prisma = new PrismaClient();

type JwtPayload = {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
  iat: number;
  exp: number;
};

type WeeklyRollup = {
  userId: string;
  weekStart: Date;
  totalHours: number;
  warning: string | null;
};

export const createTimeLog = api(
  {
    method: "POST",
    path: "/time-logs",
    expose: true,
  },
  async ({
    taskId,
    hours,
    date,
    headers,
  }: {
    taskId: string;
    hours: number;
    date: Date;
    headers: { authorization: string };
  }) => {
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Missing or invalid Authorization header.");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token) as JwtPayload;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    if (task.project.organization.id !== decoded.organizationId) {
      console.log("task.project.organization.id", task.project.organization.id);
      console.log("decoded.organizationId", decoded.organizationId);
      throw new Error("Access denied: Requires organizationId.");
    }

    const timeLog = await prisma.timeLog.create({
      data: { taskId, hours, date, userId: decoded.userId },
    });

    return { success: true, timeLog };
  }
);

export const weeklyRollup = api(
  {
    method: "GET",
    path: "/time-logs/weekly",
    expose: true,
  },
  async () => {
    try {
      const timeLogs = await prisma.timeLog.findMany({
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const weeklyData = timeLogs.reduce((acc, log) => {
        const weekStart = new Date(log.createdAt);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        const key = `${log.userId}-${weekStart.toISOString()}`;

        if (!acc[key]) {
          acc[key] = {
            userId: log.userId,
            weekStart: weekStart,
            totalHours: 0,
            warning: null,
          };
        }

        acc[key].totalHours += log.hours;

        if (acc[key].totalHours > 40) {
          acc[key].warning = "Exceeded 40 hours per week";
        } else if (acc[key].totalHours < 20) {
          acc[key].warning = "Less than 20 hours per week";
        }

        return acc;
      }, {} as Record<string, WeeklyRollup & { warning: string | null }>);

      const result = Object.values(weeklyData);

      return {
        success: true,
        rollup: result,
      };
    } catch (error) {
      console.error("Error in weeklyRollup:", error);
      throw new Error("Internal server error during weekly rollup.");
    }
  }
);
