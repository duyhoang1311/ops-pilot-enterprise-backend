-- CreateEnum
CREATE TYPE "KPIMetricUnit" AS ENUM ('PERCENTAGE', 'DAYS', 'COUNT', 'HOURS');

-- CreateTable
CREATE TABLE "kpi_metrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" "KPIMetricUnit" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_metrics_pkey" PRIMARY KEY ("id")
);
