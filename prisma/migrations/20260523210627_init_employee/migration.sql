-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "salaryCents" INTEGER NOT NULL,
    "employmentType" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_country_idx" ON "Employee"("country");

-- CreateIndex
CREATE INDEX "Employee_department_idx" ON "Employee"("department");

-- CreateIndex
CREATE INDEX "Employee_jobTitle_idx" ON "Employee"("jobTitle");

-- CreateIndex
CREATE INDEX "Employee_employmentType_idx" ON "Employee"("employmentType");
