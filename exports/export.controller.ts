import { api } from "encore.dev/api";
import { ExportService } from "./exportService";
import { ExportOptions, TaskFilter, TimeLogFilter, KPIFilter } from "./types";

const exportService = new ExportService();

// Định nghĩa kiểu dữ liệu cho request
interface ExportRequest {
  format: "CSV" | "JSON";
  type: "TASKS" | "TIMELOGS" | "KPI";
  filters: {
    status?: string[];
    userId?: string;
    projectId?: string;
    workflowId?: string;
    taskId?: string;
    metricName?: string;
    startDate?: string;
    endDate?: string;
  };
}

// Định nghĩa kiểu dữ liệu cho response
interface ExportResponse {
  data: string;
  filename: string;
  format: string;
}

// API endpoint
export const exportReport = api(
  {
    method: "POST",
    path: "/reports/export",
    expose: true,
  },
  async (params: ExportRequest): Promise<ExportResponse> => {
    try {
      // Convert dates if they exist
      const filters = { ...params.filters };
      if (filters.startDate) {
        filters.startDate = new Date(filters.startDate).toISOString();
      }
      if (filters.endDate) {
        filters.endDate = new Date(filters.endDate).toISOString();
      }

      // Create proper export options
      const options: ExportOptions = {
        format: params.format,
        type: params.type,
        filters: filters as TaskFilter | TimeLogFilter | KPIFilter,
      };

      const result = await exportService.exportData(options);

      // Return simple object
      return {
        data: result.data,
        filename: result.filename,
        format: params.format,
      };
    } catch (error) {
      console.error("Error exporting report:", error);
      throw error;
    }
  }
);
