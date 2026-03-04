-- AlterTable: Make phone optional for Apple App Store compliance
-- Guideline 5.1.1: Apps should not require users to provide personal information
-- that is not directly relevant to the core functionality of the app.
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
