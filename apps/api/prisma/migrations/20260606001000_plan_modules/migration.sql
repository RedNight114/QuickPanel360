CREATE TABLE "platform_plan_modules" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "platform_plan_modules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_plan_modules_planId_moduleId_key" ON "platform_plan_modules"("planId", "moduleId");
CREATE INDEX "platform_plan_modules_planId_idx" ON "platform_plan_modules"("planId");
CREATE INDEX "platform_plan_modules_moduleId_idx" ON "platform_plan_modules"("moduleId");

ALTER TABLE "platform_plan_modules"
  ADD CONSTRAINT "platform_plan_modules_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "platform_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platform_plan_modules"
  ADD CONSTRAINT "platform_plan_modules_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "platform_module_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
