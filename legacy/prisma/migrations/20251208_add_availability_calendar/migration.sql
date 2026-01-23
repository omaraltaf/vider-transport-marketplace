-- CreateTable
CREATE TABLE "AvailabilityBlock" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "listingType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringBlockId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringBlock" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "listingType" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvailabilityBlock_listingId_listingType_idx" ON "AvailabilityBlock"("listingId", "listingType");

-- CreateIndex
CREATE INDEX "AvailabilityBlock_startDate_endDate_idx" ON "AvailabilityBlock"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "AvailabilityBlock_recurringBlockId_idx" ON "AvailabilityBlock"("recurringBlockId");

-- CreateIndex
CREATE INDEX "RecurringBlock_listingId_listingType_idx" ON "RecurringBlock"("listingId", "listingType");

-- CreateIndex
CREATE INDEX "RecurringBlock_startDate_endDate_idx" ON "RecurringBlock"("startDate", "endDate");

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_recurringBlockId_fkey" FOREIGN KEY ("recurringBlockId") REFERENCES "RecurringBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBlock" ADD CONSTRAINT "RecurringBlock_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
