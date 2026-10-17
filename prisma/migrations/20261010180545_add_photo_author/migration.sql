-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "authorPhone" TEXT;

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Photo_issueId_key" ON "Photo"("issueId");
