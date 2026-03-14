-- CreateTable
CREATE TABLE "AgenticCheckoutSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'not_ready_for_payment',
    "paymentIntentId" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "lineItems" TEXT NOT NULL DEFAULT '[]',
    "totals" TEXT NOT NULL DEFAULT '[]',
    "workflowId" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
