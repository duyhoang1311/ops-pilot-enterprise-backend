import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";
export type AuditTarget = "task" | "project" | "user" | "timelog" | "workflow" | string;

interface LogActionParams {
  userId: string;
  action: AuditAction;
  target: AuditTarget;
  targetId?: string; // optional: dùng để lọc log theo từng đối tượng cụ thể
  data: any; // nên là object chứa thông tin before/after nếu có
}

/**
 * Ghi log hành động của người dùng
 * @param userId - ID người thực hiện hành động
 * @param action - CREATE | UPDATE | DELETE
 * @param target - Đối tượng bị tác động (task, project, ...)
 * @param data - Dữ liệu chi tiết: có thể chứa before/after hoặc payload
 */
export async function logAction({
  userId,
  action,
  target,
  targetId,
  data,
}: LogActionParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        target,
        targetId,
        data,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("[AUDIT LOG] Failed to record audit log:", error);
  }
}
