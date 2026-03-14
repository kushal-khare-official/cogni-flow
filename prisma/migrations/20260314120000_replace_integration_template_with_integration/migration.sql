-- Replace IntegrationTemplate with Integration (no operations column).
-- All existing integration template data is dropped as per plan.

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "IntegrationTemplate";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'plug',
    "category" TEXT NOT NULL DEFAULT 'custom',
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "baseConfig" TEXT NOT NULL DEFAULT '{}',
    "credentialSchema" TEXT NOT NULL DEFAULT '[]',
    "mockConfig" TEXT NOT NULL DEFAULT '{}',
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
