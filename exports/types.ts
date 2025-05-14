// import { TaskStatus } from "@prisma/client";

export type DateRange = {
  startDate?: Date;
  endDate?: Date;
};

export enum TaskStatus {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    OVERDUE = "OVERDUE",
  }

export type TaskFilter = {
  status?: TaskStatus[];
  userId?: string;
  projectId?: string;
  workflowId?: string;
} & DateRange;

export type TimeLogFilter = {
  userId?: string;
  taskId?: string;
  projectId?: string;
} & DateRange;

export type KPIFilter = {
  metricName?: string;
} & DateRange;

export type ExportFormat = "CSV" | "JSON";

export interface ExportOptions {
  format: ExportFormat;
  filters: TaskFilter | TimeLogFilter | KPIFilter;
  type: "TASKS" | "TIMELOGS" | "KPI";
}
