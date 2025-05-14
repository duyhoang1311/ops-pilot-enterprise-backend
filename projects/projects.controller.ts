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

export const createProject = api(
  {
    method: "POST",
    path: "/projects",
    expose: true,
  },
  async ({
    name,
    organizationId,
    headers,
  }: {
    name: string;
    organizationId: string;
    headers: { authorization: string };
  }) => {
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Missing or invalid Authorization header.");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token) as JwtPayload;

    if (decoded.role !== "PROJECTMANAGER") {
      throw new Error("Access denied: Requires PROJECTMANAGER role.");
    }

    const project = await prisma.project.create({
      data: { name, organizationId },
    });

    return { success: true, project };
  }
);
