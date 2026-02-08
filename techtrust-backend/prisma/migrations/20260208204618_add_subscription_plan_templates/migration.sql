-- CreateTable
CREATE TABLE "subscription_plan_templates" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "yearlyPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vehicleLimit" INTEGER NOT NULL DEFAULT 1,
    "serviceRequestsPerMonth" INTEGER,
    "features" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "subscription_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_templates_planKey_key" ON "subscription_plan_templates"("planKey");

-- CreateIndex
CREATE INDEX "subscription_plan_templates_isActive_idx" ON "subscription_plan_templates"("isActive");

-- CreateIndex
CREATE INDEX "subscription_plan_templates_position_idx" ON "subscription_plan_templates"("position");
