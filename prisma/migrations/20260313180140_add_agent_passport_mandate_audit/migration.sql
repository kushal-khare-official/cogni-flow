/*
  Warnings:

  - You are about to drop the `Agent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AgentActivity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AgentVirtualCard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `active` on the `AgentMandate` table. All the data in the column will be lost.
  - You are about to drop the column `agentId` on the `AgentMandate` table. All the data in the column will be lost.
  - You are about to drop the column `allowedEndpoints` on the `AgentMandate` table. All the data in the column will be lost.
  - You are about to drop the column `allowedOperations` on the `AgentMandate` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `AgentMandate` table. All the data in the column will be lost.
  - You are about to drop the column `maxDailyAmount` on the `AgentMandate` table. All the data in the column will be lost.
  - You are about to drop the column `maxTransactionAmount` on the `AgentMandate` table. All the data in the column will be lost.
  - You are about to drop the column `revokedAt` on the `AgentMandate` table. All the data in the column will be lost.
  - Added the required column `agentPassportId` to the `AgentMandate` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Agent_fingerprint_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Agent";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AgentActivity";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AgentVirtualCard";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "AgentPassport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "modelProvider" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "creatorName" TEXT NOT NULL,
    "creatorVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "revokedReason" TEXT,
    "stripeKeyScope" TEXT NOT NULL DEFAULT '[]',
    "authMethod" TEXT NOT NULL DEFAULT 'api_key',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME
);

-- CreateTable
CREATE TABLE "AgentAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentPassportId" TEXT NOT NULL,
    "executionRunId" TEXT,
    "nodeId" TEXT,
    "action" TEXT NOT NULL,
    "stripeObjectId" TEXT,
    "amountCents" INTEGER,
    "status" TEXT NOT NULL,
    "anomalyScore" REAL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentAuditLog_agentPassportId_fkey" FOREIGN KEY ("agentPassportId") REFERENCES "AgentPassport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentMandate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentPassportId" TEXT NOT NULL,
    "workflowId" TEXT,
    "description" TEXT NOT NULL,
    "maxAmountCents" INTEGER NOT NULL DEFAULT 5000,
    "maxTotalSpendCents" INTEGER NOT NULL DEFAULT 50000,
    "spentCents" INTEGER NOT NULL DEFAULT 0,
    "allowedActions" TEXT NOT NULL DEFAULT '[]',
    "allowedMCCs" TEXT NOT NULL DEFAULT '[]',
    "ttlSeconds" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "signatureHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "AgentMandate_agentPassportId_fkey" FOREIGN KEY ("agentPassportId") REFERENCES "AgentPassport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentMandate_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AgentMandate" ("allowedMCCs", "createdAt", "description", "expiresAt", "id", "signatureHash", "ttlSeconds", "workflowId") SELECT "allowedMCCs", "createdAt", "description", "expiresAt", "id", "signatureHash", "ttlSeconds", "workflowId" FROM "AgentMandate";
DROP TABLE "AgentMandate";
ALTER TABLE "new_AgentMandate" RENAME TO "AgentMandate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AgentPassport_fingerprint_key" ON "AgentPassport"("fingerprint");
