// src/users/controller.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const getUsersInOrg = encore.route({
  method: 'GET',
  path: '/users',
  handler: async (req) => {
    const orgId = req.context.user.organizationId;
    return prisma.user.findMany({ where: { organizationId: orgId } });
  }
});
