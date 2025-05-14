// Trong file kpi/kpi.controller.ts

import { PrismaClient, TaskStatus } from "@prisma/client";
import { api } from "encore.dev/api";

const prisma = new PrismaClient();

type KPIReport = {
  organizationMetrics: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    averageProjectDuration: number; // in days
    topPerformers: {
      userId: string;
      userName: string;
      completedTasks: number;
      averageTaskDuration: number;
      totalHours: number;
    }[];
  };
  teamMetrics: {
    projectId: string;
    projectName: string;
    completionRate: number;
    averageDuration: number;
    teamMembers: {
      userId: string;
      userName: string;
      completedTasks: number;
      inProgressTasks: number;
    }[];
  }[];
};

export const getKPIReport = api(
  {
    method: "GET",
    path: "/kpi-report",
    expose: true,
  },
  async ({ organizationId }: { organizationId: string }) => {
    try {
      // 1. Tổng hợp metrics cấp tổ chức
      const orgMetrics = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          projects: {
            include: {
              tasks: {
                include: {
                  user: true,
                  timeLogs: true,
                },
              },
            },
          },
        },
      });

      if (!orgMetrics) {
        throw new Error("Organization not found");
      }

      // Tính toán các metrics tổ chức
      const allTasks = orgMetrics.projects.flatMap(p => p.tasks);
      const completedTasks = allTasks.filter(t => t.status === "COMPLETED");

      // Tính toán top performers
      const userPerformance = new Map();
      allTasks.forEach(task => {
        const userData = userPerformance.get(task.userId) || {
          userId: task.userId,
          userName: task.user.name,
          completedTasks: 0,
          totalDuration: 0,
          totalHours: 0,
        };

        if (task.status === "COMPLETED") {
          userData.completedTasks++;
          // Tính thời gian hoàn thành task
          const taskDuration = Math.floor(
            (task.updatedAt.getTime() - task.createdAt.getTime()) / 
            (1000 * 60 * 60 * 24)
          );
          userData.totalDuration += taskDuration;
        }

        // Tính tổng số giờ làm việc
        const taskHours = task.timeLogs.reduce((sum, log) => sum + log.hours, 0);
        userData.totalHours += taskHours;

        userPerformance.set(task.userId, userData);
      });

      const topPerformers = Array.from(userPerformance.values())
        .map(user => ({
          ...user,
          averageTaskDuration: user.completedTasks > 0 
            ? user.totalDuration / user.completedTasks 
            : 0,
        }))
        .sort((a, b) => b.completedTasks - a.completedTasks)
        .slice(0, 5);

      // 2. Tổng hợp metrics cấp team (project)
      const teamMetrics = await Promise.all(
        orgMetrics.projects.map(async (project) => {
          const projectTasks = project.tasks;
          const completedProjectTasks = projectTasks.filter(
            t => t.status === "COMPLETED"
          );

          // Tính toán metrics cho từng thành viên
          const teamMemberMetrics = new Map();
          projectTasks.forEach(task => {
            const memberData = teamMemberMetrics.get(task.userId) || {
              userId: task.userId,
              userName: task.user.name,
              completedTasks: 0,
              inProgressTasks: 0,
            };

            if (task.status === "COMPLETED") {
              memberData.completedTasks++;
            } else if (task.status === "IN_PROGRESS") {
              memberData.inProgressTasks++;
            }

            teamMemberMetrics.set(task.userId, memberData);
          });

          return {
            projectId: project.id,
            projectName: project.name,
            completionRate: projectTasks.length > 0
              ? (completedProjectTasks.length / projectTasks.length) * 100
              : 0,
            averageDuration: completedProjectTasks.length > 0
              ? completedProjectTasks.reduce((sum, task) => 
                  sum + Math.floor((task.updatedAt.getTime() - task.createdAt.getTime()) / 
                  (1000 * 60 * 60 * 24)), 0) / completedProjectTasks.length
              : 0,
            teamMembers: Array.from(teamMemberMetrics.values()),
          };
        })
      );

      const report: KPIReport = {
        organizationMetrics: {
          totalTasks: allTasks.length,
          completedTasks: completedTasks.length,
          completionRate: allTasks.length > 0 
            ? (completedTasks.length / allTasks.length) * 100 
            : 0,
          averageProjectDuration: teamMetrics.reduce(
            (sum, team) => sum + team.averageDuration, 0
          ) / teamMetrics.length,
          topPerformers,
        },
        teamMetrics,
      };

      return {
        success: true,
        report,
      };
    } catch (error) {
      console.error("Error generating KPI report:", error);
      throw new Error("Failed to generate KPI report");
    }
  }
);