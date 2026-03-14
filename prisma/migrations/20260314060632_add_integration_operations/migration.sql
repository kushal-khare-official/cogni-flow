-- RedefineTables: Add operations column to Integration
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Integration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'plug',
    "category" TEXT NOT NULL DEFAULT 'custom',
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "baseConfig" TEXT NOT NULL DEFAULT '{}',
    "operations" TEXT NOT NULL DEFAULT '[]',
    "credentialSchema" TEXT NOT NULL DEFAULT '[]',
    "mockConfig" TEXT NOT NULL DEFAULT '{}',
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Integration" ("baseConfig", "category", "createdAt", "credentialSchema", "description", "icon", "id", "isBuiltIn", "mockConfig", "name", "type", "updatedAt") SELECT "baseConfig", "category", "createdAt", "credentialSchema", "description", "icon", "id", "isBuiltIn", "mockConfig", "name", "type", "updatedAt" FROM "Integration";
DROP TABLE "Integration";
ALTER TABLE "new_Integration" RENAME TO "Integration";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
