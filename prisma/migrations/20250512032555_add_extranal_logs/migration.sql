-- CreateTable
CREATE TABLE "external_logs" (
    "id" UUID NOT NULL,
    "taskId" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "projectCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "external_logs" ADD CONSTRAINT "external_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
