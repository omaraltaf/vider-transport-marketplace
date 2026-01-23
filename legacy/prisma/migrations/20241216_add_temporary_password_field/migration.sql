-- Add temporary password tracking field to User table
ALTER TABLE "User" ADD COLUMN "isTemporaryPassword" BOOLEAN NOT NULL DEFAULT false;