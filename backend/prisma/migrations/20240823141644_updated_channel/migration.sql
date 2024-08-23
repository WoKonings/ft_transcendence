/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Channel` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `Channel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `private` to the `Channel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "banned" TEXT[],
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "private" BOOLEAN NOT NULL,
ALTER COLUMN "users" SET DATA TYPE TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Channel_name_key" ON "Channel"("name");
