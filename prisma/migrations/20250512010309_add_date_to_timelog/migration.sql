/*
  Warnings:

  - You are about to drop the column `duration` on the `time_logs` table. All the data in the column will be lost.
  - Added the required column `date` to the `time_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hours` to the `time_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "time_logs" DROP COLUMN "duration",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "hours" DOUBLE PRECISION NOT NULL;
