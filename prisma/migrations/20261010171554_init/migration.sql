-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'new',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "confirms" INTEGER NOT NULL DEFAULT 1,
    "escalations" INTEGER NOT NULL DEFAULT 0,
    "photoUrl" TEXT,
    "department" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "photoUrl" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentLog" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentLog" ADD CONSTRAINT "AgentLog_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
