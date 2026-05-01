-- CreateTable
CREATE TABLE "HomePage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Welcome to UCA',
    "description" TEXT NOT NULL DEFAULT 'Share files securely with style',
    "bullet1Name" TEXT NOT NULL DEFAULT 'Secure Sharing',
    "bullet1Desc" TEXT NOT NULL DEFAULT 'End-to-end encrypted file sharing',
    "bullet2Name" TEXT NOT NULL DEFAULT 'Lightning Fast',
    "bullet2Desc" TEXT NOT NULL DEFAULT 'Optimized performance for amazing developers',
    "bullet3Name" TEXT NOT NULL DEFAULT 'Anonymous',
    "bullet3Desc" TEXT NOT NULL DEFAULT 'Your privacy is our priority',
    "buttonText" TEXT NOT NULL DEFAULT 'Get Started',
    "updatedBy" TEXT
);
