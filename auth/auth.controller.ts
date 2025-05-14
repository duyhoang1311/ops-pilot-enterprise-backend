import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { api } from "encore.dev/api";
import { signToken } from "./jwt";
import { requireRole } from "./middleware";


const prisma = new PrismaClient();

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "fallback-secret-for-development",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    modelName: "Auth", // Chuyển từ User sang Auth
    additionalFields: {
      username: {
        type: "string",
        required: true,
        input: true,
      },
      password: {
        type: "string",
        required: true,
        input: true,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  session: {
    disableSessionRefresh: true,
  },
});

export const register = api(
  {
    method: "POST",
    path: "/auth/register",
    expose: true,
  },
  async ({
    name,
    email,
    password,
    organizationId,
  }: {
    name: string;
    email: string;
    password: string;
    organizationId: string;
  }) => {
    console.log("Received data:", { name, email, password, organizationId });
    try {
      // Kiểm tra tổ chức có tồn tại không
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new Error("Organization not found");
      }

      // Tạo bản ghi User
      const user = await prisma.user.create({
        data: {
          name,
          email,
          role: "EMPLOYEE",
          organizationId,
        },
      });

      // Tạo bản ghi Auth
      await prisma.auth.create({
        data: {
          username: email,
          password,
          userId: user.id,
        },
      });

      return {
        success: true,
        message: "User registered successfully",
        data: { user },
      };
    } catch (error) {
      console.error("Registration error:", error);
      throw new Error("Failed to register user");
    }
  }
);

export const login = api(
  {
    method: "POST",
    path: "/auth/login",
    expose: true,
  },
  async ({ email, password }: { email: string; password: string }) => {
    try {
      const authUser = await prisma.auth.findUnique({
        where: { username: email },
        include: { user: true },
      });

      if (!authUser || authUser.password !== password) {
        throw new Error("Invalid credentials");
      }

      const token = signToken({
        userId: authUser.userId,
        email: authUser.username,
        role: authUser.user.role,
        organizationId: authUser.user.organizationId,
      });

      return {
        success: true,
        message: "Login successful",
        token, // Trả về token ở đây
        user: {
          id: authUser.userId,
          email: authUser.username,
          role: authUser.user.role,
          organizationId: authUser.user.organizationId,
        },
      };
    } catch (error) {
      console.error("Login error:", error);
      throw new Error("Invalid credentials");
    }
  }
);

export const getAdminData = api(
  {
    method: "GET",
    path: "/auth/admin-data",
    expose: true,
  },
  async ({ userId }: { userId: string }) => {
    try {
      // Fetch the user to check their role
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== "ORGADMIN") {
        throw new Error("Access denied: User does not have the required role.");
      }

      // Your logic to fetch admin data goes here
      const adminData = { message: "This is protected admin data." };
      return { success: true, data: adminData };
    } catch (error) {
      console.error("Error fetching admin data:", error);
      return {
        success: false,
        message: "An internal error occurred.",
        internal_message: "Failed to fetch admin data.",
      };
    }
  }
);
