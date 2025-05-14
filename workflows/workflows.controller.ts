import { PrismaClient } from "@prisma/client";
import { api } from "encore.dev/api";
import { verifyToken } from "../auth/jwt";

const prisma = new PrismaClient();

type JwtPayload = {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
  iat: number;
  exp: number;
};

export const createWorkflow = api(
  {
    method: "POST",
    path: "/workflows",
    expose: true,
  },
  async ({
    name,
    projectId,
    headers,
  }: {
    name: string;
    projectId: string;
    headers: { authorization: string };
  }) => {
    // 1. Xác thực token
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Missing or invalid Authorization header.");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token) as JwtPayload;

    // 2. Kiểm tra role
    if (decoded.role !== "PROJECTMANAGER") {
      throw new Error("Access denied: Requires PROJECTMANAGER role.");
    }

    // 3. Kiểm tra projectId có tồn tại và thuộc về cùng organization
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error("Project not found.");
    }

    if (project.organizationId !== decoded.organizationId) {
      throw new Error("Access denied: Project does not belong to your organization.");
    }

    // 4. Tạo workflow
    const workflow = await prisma.workflow.create({
      data: { name, projectId },
    });

    return { success: true, workflow };
  }
);
