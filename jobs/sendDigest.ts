import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function generateAndSendDigest() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Gather statistics
  const [totalTasks, completedTasks, overdueTasks, newTasks] =
    await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { status: "COMPLETED" } }),
      prisma.task.count({ where: { status: "OVERDUE" } }),
      prisma.task.count({
        where: {
          createdAt: {
            gte: yesterday,
            lt: today,
          },
        },
      }),
    ]);

  // Generate HTML digest
  const digestHtml = `
    <h1>Daily Operations Digest</h1>
    <p>Generated on: ${today.toLocaleDateString()}</p>
    
    <h2>Task Statistics</h2>
    <ul>
      <li>Total Tasks: ${totalTasks}</li>
      <li>Completed Tasks: ${completedTasks}</li>
      <li>Overdue Tasks: ${overdueTasks}</li>
      <li>New Tasks (24h): ${newTasks}</li>
    </ul>
    
    <h2>Completion Rate</h2>
    <p>Task Completion Rate: ${((completedTasks / totalTasks) * 100).toFixed(
      2
    )}%</p>
  `;

  // Mock sending email
  console.log("[CRON] Daily digest generated");
  console.log("Would send email with following content:");
  console.log(digestHtml);

  return {
    sent: true,
    timestamp: new Date(),
    stats: {
      totalTasks,
      completedTasks,
      overdueTasks,
      newTasks,
    },
  };
}
