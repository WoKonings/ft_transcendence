/*
  Warnings:

  - The `admin` column on the `Channel` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ChannelRole" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "Channel" DROP COLUMN "admin",
ADD COLUMN     "admin" INTEGER[];

-- CreateTable
CREATE TABLE "UserChannel" (
    "userId" INTEGER NOT NULL,
    "channelId" INTEGER NOT NULL,
    "role" "ChannelRole" NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "UserChannel_userId_channelId_key" ON "UserChannel"("userId", "channelId");

-- AddForeignKey
ALTER TABLE "UserChannel" ADD CONSTRAINT "UserChannel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChannel" ADD CONSTRAINT "UserChannel_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
