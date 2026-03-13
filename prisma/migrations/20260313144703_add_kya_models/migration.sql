-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending_verification',
    "fingerprint" TEXT NOT NULL,
    "modelProvider" TEXT NOT NULL DEFAULT '',
    "modelId" TEXT NOT NULL DEFAULT '',
    "modelVersion" TEXT NOT NULL DEFAULT '',
    "creatorName" TEXT NOT NULL,
    "creatorEmail" TEXT NOT NULL,
    "creatorOrgId" TEXT NOT NULL DEFAULT '',
    "creatorVerified" BOOLEAN NOT NULL DEFAULT false,
    "apiKeyHash" TEXT NOT NULL,
    "apiKeyPrefix" TEXT NOT NULL,
    "passportData" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "lastActiveAt" DATETIME
);

-- CreateTable
CREATE TABLE "AgentMandate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "workflowId" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "maxTransactionAmount" REAL NOT NULL DEFAULT 0,
    "maxDailyAmount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "allowedMCCs" TEXT NOT NULL DEFAULT '[]',
    "allowedOperations" TEXT NOT NULL DEFAULT '[]',
    "allowedEndpoints" TEXT NOT NULL DEFAULT '[]',
    "ttlSeconds" INTEGER NOT NULL DEFAULT 86400,
    "expiresAt" DATETIME,
    "signatureHash" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "AgentMandate_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL DEFAULT '',
    "amount" REAL,
    "currency" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "riskScore" REAL NOT NULL DEFAULT 0,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "mandateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentActivity_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentVirtualCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "fundedAmount" REAL NOT NULL DEFAULT 0,
    "spentAmount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "mandateId" TEXT,
    "singleUse" BOOLEAN NOT NULL DEFAULT false,
    "allowedMCCs" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" DATETIME,
    CONSTRAINT "AgentVirtualCard_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_fingerprint_key" ON "Agent"("fingerprint");
