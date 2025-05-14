/*
  Warnings:

  - Added the required column `updated_at` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Thêm cột với giá trị mặc định là thời điểm hiện tại
ALTER TABLE "tasks" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Sau khi thêm cột, cập nhật lại default constraint
ALTER TABLE "tasks" ALTER COLUMN "updated_at" DROP DEFAULT;
