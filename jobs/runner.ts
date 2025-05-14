import { PrismaClient } from "@prisma/client";
import { api } from "encore.dev/api";
import * as cron from "node-cron";
import { markOverdueTasks } from "./markOverdueTasks";
import { generateAndSendDigest } from "./sendDigest";
import { recalculateKpis } from "./recalculateKpis";

const prisma = new PrismaClient();

// Schedule all jobs to run at midnight (00:00)
const scheduleDailyJobs = () => {
  cron.schedule("0 0 3 * *", async () => {
    console.log("[CRON] Starting daily jobs at", new Date().toISOString());

    try {
      // Run jobs sequentially to avoid any potential race conditions
      await markOverdueTasks();
      await generateAndSendDigest();
      await recalculateKpis();

      console.log("[CRON] All daily jobs completed successfully");
    } catch (error) {
      console.error("[CRON] Error in daily jobs:", error);
    }
  });
};

// API endpoint to manually trigger jobs
export const runCronJob = api(
  {
    method: "POST",
    path: "/cron/run",
    expose: true,
  },
  async () => {
    try {
      await markOverdueTasks();
      await generateAndSendDigest();
      await recalculateKpis();

      return {
        success: true,
        timestamp: new Date(),
        message: "All jobs executed successfully",
      };
    } catch (error) {
      console.error("Error running jobs:", error);
      throw new Error("Failed to run jobs");
    }
  }
);

// Start the scheduler when the file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Starting job scheduler...");
  scheduleDailyJobs();
  console.log(
    "Job scheduler is running. Jobs will execute at midnight (00:00)"
  );
}
