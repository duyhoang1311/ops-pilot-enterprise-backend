import { api } from "encore.dev/api";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getLeaderboard = api(
  {
    method: "GET",
    path: "/leaderboard",
    expose: true,
  },
  async () => {
    const users = await prisma.user.findMany({
      include: {
        tasks: { where: { status: "COMPLETED" } },
        timeLogs: true,
      },
    });

    const leaderboard = users.map((user) => {
      const hoursLogged = user.timeLogs.reduce(
        (sum, log) => sum + log.hours,
        0
      );
      const completedTasks = user.tasks.length;
      const efficiency = hoursLogged > 0 ? completedTasks / hoursLogged : 0;

      return {
        userId: user.id,
        email: user.email,
        completedTasks,
        hoursLogged,
        efficiency,
        badges: [] as string[],
      };
    });

    // Sắp xếp theo efficiency giảm dần
    leaderboard.sort((a, b) => b.efficiency - a.efficiency);

    // Gán badge
    const topPerformerId =
      leaderboard.length > 0 ? leaderboard[0].userId : null;
    const mostTasks = Math.max(...leaderboard.map((u) => u.completedTasks), 0);

    leaderboard.forEach((u) => {
      const badges: string[] = [];

      if (u.userId === topPerformerId) {
        badges.push("Top Performer");
      }
      if (u.completedTasks === mostTasks && mostTasks > 0) {
        badges.push("Task Slayer");
      }
      if (u.hoursLogged >= 10) {
        badges.push("Consistent Logger");
      }

      u.badges = badges;
    });

    return { success: true, leaderboard };
  }
);
