import { PrismaClient, Task, TimeLog, KPIMetric } from "@prisma/client";
import { ExportOptions, TaskFilter, TimeLogFilter, KPIFilter } from "./types";

const prisma = new PrismaClient();

export class ExportService {
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return "";

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV rows
    const csvRows = [
      // Header row
      headers.join(","),
      // Data rows
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Handle different types of values
            if (value === null || value === undefined) return "";
            if (value instanceof Date) return value.toISOString();
            if (typeof value === "string")
              return `"${value.replace(/"/g, '""')}"`;
            return String(value);
          })
          .join(",")
      ),
    ];

    return csvRows.join("\n");
  }

  private async getTasks(filters: TaskFilter) {
    return prisma.task.findMany({
      where: {
        AND: [
          filters.status ? { status: { in: filters.status } } : {},
          filters.userId ? { userId: filters.userId } : {},
          filters.projectId ? { projectId: filters.projectId } : {},
          filters.workflowId ? { workflowId: filters.workflowId } : {},
          filters.startDate ? { createdAt: { gte: filters.startDate } } : {},
          filters.endDate ? { createdAt: { lte: filters.endDate } } : {},
        ],
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
        workflow: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  private async getTimeLogs(filters: TimeLogFilter) {
    return prisma.timeLog.findMany({
      where: {
        AND: [
          filters.userId ? { userId: filters.userId } : {},
          filters.taskId ? { taskId: filters.taskId } : {},
          filters.startDate ? { date: { gte: filters.startDate } } : {},
          filters.endDate ? { date: { lte: filters.endDate } } : {},
        ],
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        task: {
          select: {
            title: true,
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  private async getKPIMetrics(filters: KPIFilter) {
    return prisma.kPIMetric.findMany({
      where: {
        AND: [
          filters.metricName ? { metricName: filters.metricName } : {},
          filters.startDate ? { date: { gte: filters.startDate } } : {},
          filters.endDate ? { date: { lte: filters.endDate } } : {},
        ],
      },
    });
  }

  private formatTasksForExport(tasks: any[]) {
    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      deadline: task.deadline,
      assignedTo: task.user.name,
      userEmail: task.user.email,
      project: task.project.name,
      workflow: task.workflow.name,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
  }

  private formatTimeLogsForExport(timeLogs: any[]) {
    return timeLogs.map((log) => ({
      id: log.id,
      date: log.date,
      hours: log.hours,
      userName: log.user.name,
      userEmail: log.user.email,
      taskTitle: log.task.title,
      project: log.task.project.name,
    }));
  }

  private formatKPIMetricsForExport(metrics: KPIMetric[]) {
    return metrics.map((metric) => ({
      date: metric.date,
      metricName: metric.metricName,
      value: metric.value,
      unit: metric.unit,
    }));
  }

  public async exportData(
    options: ExportOptions
  ): Promise<{ data: string; filename: string }> {
    let data: any[] = [];
    let formattedData: any[] = [];
    const timestamp = new Date().toISOString().split("T")[0];

    // Fetch and format data based on type
    switch (options.type) {
      case "TASKS":
        data = await this.getTasks(options.filters as TaskFilter);
        formattedData = this.formatTasksForExport(data);
        break;
      case "TIMELOGS":
        data = await this.getTimeLogs(options.filters as TimeLogFilter);
        formattedData = this.formatTimeLogsForExport(data);
        break;
      case "KPI":
        data = await this.getKPIMetrics(options.filters as KPIFilter);
        formattedData = this.formatKPIMetricsForExport(data);
        break;
    }

    // Generate export file
    if (options.format === "CSV") {
      const csv = this.convertToCSV(formattedData);
      return {
        data: csv,
        filename: `${options.type.toLowerCase()}_export_${timestamp}.csv`,
      };
    } else {
      return {
        data: JSON.stringify(formattedData, null, 2),
        filename: `${options.type.toLowerCase()}_export_${timestamp}.json`,
      };
    }
  }
}
