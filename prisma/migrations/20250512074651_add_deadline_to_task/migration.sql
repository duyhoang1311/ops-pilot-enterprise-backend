-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'OVERDUE';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "deadline" TIMESTAMP(3);
