import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function recalculateKpis() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  try {
    // Calculate task completion rate
    const [totalTasks, completedTasks] = await Promise.all([
      prisma.task.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),
      prisma.task.count({
        where: {
          status: "COMPLETED",
          updatedAt: {
            gte: startOfMonth,
          },
        },
      }),
    ]);

    const completionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate average completion time (in days)
    const completedTasksWithDuration = await prisma.task.findMany({
      where: {
        status: "COMPLETED",
        updatedAt: {
          gte: startOfMonth,
        },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    const avgCompletionTime =
      completedTasksWithDuration.reduce((acc, task) => {
        const duration = task.updatedAt.getTime() - task.createdAt.getTime();
        return acc + duration / (1000 * 60 * 60 * 24); // Convert to days
      }, 0) / (completedTasksWithDuration.length || 1);

    // Store KPI metrics
    await prisma.kPIMetric.create({
      data: {
        date: today,
        metricName: "TASK_COMPLETION_RATE",
        value: completionRate,
        unit: "PERCENTAGE",
      },
    });

    await prisma.kPIMetric.create({
      data: {
        date: today,
        metricName: "AVG_COMPLETION_TIME",
        value: avgCompletionTime,
        unit: "DAYS",
      },
    });

    console.log("[CRON] KPIs recalculated successfully", {
      completionRate: `${completionRate.toFixed(2)}%`,
      avgCompletionTime: `${avgCompletionTime.toFixed(2)} days`,
    });

    return {
      success: true,
      metrics: {
        completionRate,
        avgCompletionTime,
      },
    };
  } catch (error) {
    console.error("[CRON] Error recalculating KPIs:", error);
    throw error;
  }
}
