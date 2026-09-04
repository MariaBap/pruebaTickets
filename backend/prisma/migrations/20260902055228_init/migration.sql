-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'agent');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('billing', 'technical', 'account', 'other');

-- CreateEnum
CREATE TYPE "EnrichmentStatus" AS ENUM ('pending', 'processing', 'done', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(180) NOT NULL,
    "passwordHash" VARCHAR(60) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'agent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "createdById" INTEGER NOT NULL,
    "assignedToId" INTEGER,
    "priority" "TicketPriority",
    "category" "TicketCategory",
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suggestedReply" TEXT,
    "enrichmentStatus" "EnrichmentStatus" NOT NULL DEFAULT 'pending',
    "enrichedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_priority_idx" ON "tickets"("priority");

-- CreateIndex
CREATE INDEX "tickets_category_idx" ON "tickets"("category");

-- CreateIndex
CREATE INDEX "tickets_enrichmentStatus_idx" ON "tickets"("enrichmentStatus");

-- CreateIndex
CREATE INDEX "tickets_createdById_idx" ON "tickets"("createdById");

-- CreateIndex
CREATE INDEX "tickets_assignedToId_idx" ON "tickets"("assignedToId");

-- CreateIndex
CREATE INDEX "tickets_createdAt_idx" ON "tickets"("createdAt");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
