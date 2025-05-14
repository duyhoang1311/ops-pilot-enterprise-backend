import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.create({
    data: { name: "MarvelX Inc" },
  });

  await prisma.user.createMany({
    data: [
      { email: "admin@marvelx.com", role: "ORGADMIN", organizationId: org.id },
      {
        email: "pm@marvelx.com",
        role: "PROJECTMANAGER",
        organizationId: org.id,
      },
      { email: "dev@marvelx.com", role: "EMPLOYEE", organizationId: org.id },
    ],
  });
}

main().finally(() => prisma.$disconnect());
