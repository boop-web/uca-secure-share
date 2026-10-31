-- UCA control center (uca-control-v1): last seen, audit log, hub queue, small state
ALTER TABLE "User" ADD COLUMN "lastSeenAt" DATETIME;

CREATE TABLE "UcaAudit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL DEFAULT 'info',
    "kind" TEXT NOT NULL,
    "actor" TEXT,
    "detail" TEXT
);
CREATE INDEX "UcaAudit_at_idx" ON "UcaAudit"("at");

CREATE TABLE "UcaHubQueue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextTryAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneAt" DATETIME
);
CREATE INDEX "UcaHubQueue_email_idx" ON "UcaHubQueue"("email");

CREATE TABLE "UcaState" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
