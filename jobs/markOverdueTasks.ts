import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function markOverdueTasks() {
  const now = new Date();

  const updated = await prisma.task.updateMany({
    where: {
      deadline: { lt: now },
      status: { notIn: ["COMPLETED", "OVERDUE"] },
    },
    data: { status: "OVERDUE" },
  });

  console.log(`[CRON] Marked ${updated.count} tasks as OVERDUE`);
}
