import { api } from "encore.dev/api";
import { PrismaClient } from "@prisma/client";
import csv from "csv-parser";
import { Readable } from "stream";

const prisma = new PrismaClient();

type CombinedWeeklyRollup = {
  userId: string;
  weekStart: Date;
  internalHours: number;
  externalHours: number;
  totalHours: number;
  warning: string | null;
};

export const uploadExternalLog = api(
  {
    method: "POST",
    path: "/upload-external-log",
    expose: true,
  },
  async ({
    fileContent,
    fileName,
  }: {
    fileContent: string;
    fileName: string;
  }) => {
    try {
      // Tạo readable stream từ content
      const stream = Readable.from(fileContent);
      const records: any[] = [];

      // Đọc và parse CSV
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on("data", (row) => records.push(row))
          .on("end", resolve)
          .on("error", reject);
      });

      console.log("Parsed records:", records); // Log records đã parse được

      let createdCount = 0;
      // Xử lý từng record
      for (const row of records) {
        console.log("Processing row:", row); // Log từng row đang xử lý

        const task = await prisma.task.findFirst({
          where: {
            projectId: row.projectCode,
          },
        });

        console.log("Found task:", task); // Log task tìm được

        if (task) {
          await prisma.externalLog.create({
            data: {
              taskId: task.id,
              hours: parseFloat(row.hours),
              date: new Date(row.date),
              projectCode: row.projectCode,
            },
          });
          createdCount++;
        } else {
          console.log(`No task found for projectCode: ${row.projectCode}`);
        }
      }

      return {
        success: true,
        message: "File processed successfully",
        processedRecords: records.length,
        createdRecords: createdCount, // Thêm số lượng record thực sự được tạo
      };
    } catch (error) {
      console.error("Error processing external log:", error);
      throw new Error("Error processing the file: " + (error as Error).message);
    }
  }
);

export const combinedWeeklyRollup = api(
  {
    method: "GET",
    path: "/time-logs/combined-weekly",
    expose: true,
  },
  async () => {
    try {
      // 1. Lấy tất cả time logs nội bộ
      const internalLogs = await prisma.timeLog.findMany({
        include: {
          user: true,
          task: true,
        },
        orderBy: {
          date: "desc",
        },
      });

      // 2. Lấy tất cả external logs
      const externalLogs = await prisma.externalLog.findMany({
        include: {
          task: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      });

      // 3. Tổng hợp dữ liệu
      const combinedData: Record<string, CombinedWeeklyRollup> = {};

      // Xử lý internal logs
      internalLogs.forEach(log => {
        const weekStart = new Date(log.date);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        const key = `${log.userId}-${weekStart.toISOString()}`;

        if (!combinedData[key]) {
          combinedData[key] = {
            userId: log.userId,
            weekStart: weekStart,
            internalHours: 0,
            externalHours: 0,
            totalHours: 0,
            warning: null,
          };
        }

        combinedData[key].internalHours += log.hours;
        combinedData[key].totalHours += log.hours;
      });

      // Xử lý external logs
      externalLogs.forEach(log => {
        const weekStart = new Date(log.date);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        const key = `${log.task.userId}-${weekStart.toISOString()}`;

        if (!combinedData[key]) {
          combinedData[key] = {
            userId: log.task.userId,
            weekStart: weekStart,
            internalHours: 0,
            externalHours: 0,
            totalHours: 0,
            warning: null,
          };
        }

        combinedData[key].externalHours += log.hours;
        combinedData[key].totalHours += log.hours;
      });

      // 4. Thêm cảnh báo dựa trên tổng số giờ
      Object.values(combinedData).forEach(data => {
        if (data.totalHours > 40) {
          data.warning = "Exceeded 40 hours per week";
        } else if (data.totalHours < 20) {
          data.warning = "Less than 20 hours per week";
        }
      });

      // 5. Chuyển đổi thành mảng và sắp xếp theo tuần
      const result = Object.values(combinedData).sort(
        (a, b) => b.weekStart.getTime() - a.weekStart.getTime()
      );

      return {
        success: true,
        rollup: result,
        summary: {
          totalUsers: new Set(result.map(r => r.userId)).size,
          totalWeeks: result.length,
          averageHoursPerWeek: result.reduce((acc, curr) => acc + curr.totalHours, 0) / result.length,
        },
      };
    } catch (error) {
      console.error("Error in combinedWeeklyRollup:", error);
      throw new Error("Internal server error during combined weekly rollup.");
    }
  }
);
