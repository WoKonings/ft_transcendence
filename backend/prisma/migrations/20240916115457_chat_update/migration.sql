/*
  Warnings:

  - You are about to drop the column `users` on the `Channel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Channel" DROP COLUMN "users";

-- CreateTable
CREATE TABLE "_UserChannels" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_UserChannels_AB_unique" ON "_UserChannels"("A", "B");

-- CreateIndex
CREATE INDEX "_UserChannels_B_index" ON "_UserChannels"("B");

-- AddForeignKey
ALTER TABLE "_UserChannels" ADD CONSTRAINT "_UserChannels_A_fkey" FOREIGN KEY ("A") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserChannels" ADD CONSTRAINT "_UserChannels_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
