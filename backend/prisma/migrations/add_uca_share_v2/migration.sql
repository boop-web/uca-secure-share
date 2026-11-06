-- UCA Share v2: link modes (downloads / days), download counter + events (no IP), app API pending uploads
ALTER TABLE "Share" ADD COLUMN "mode" TEXT;
ALTER TABLE "Share" ADD COLUMN "maxDownloads" INTEGER;
ALTER TABLE "Share" ADD COLUMN "downloads" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Share" ADD COLUMN "endedAt" DATETIME;
ALTER TABLE "Share" ADD COLUMN "pending" TEXT;

CREATE TABLE "ShareDownload" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shareId" TEXT NOT NULL,
    "ownerId" TEXT,
    "n" INTEGER NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device" TEXT NOT NULL,
    "visit" TEXT NOT NULL,
    CONSTRAINT "ShareDownload_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ShareDownload_shareId_idx" ON "ShareDownload"("shareId");
CREATE INDEX "ShareDownload_ownerId_id_idx" ON "ShareDownload"("ownerId", "id");
