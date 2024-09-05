/*
  Warnings:

  - You are about to drop the column `gamesWon` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "gamesWon";

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "playerScores" INTEGER[],
    "playerEloChanges" INTEGER[],
    "winnerId" INTEGER NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PlayerGames" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_PlayerGames_AB_unique" ON "_PlayerGames"("A", "B");

-- CreateIndex
CREATE INDEX "_PlayerGames_B_index" ON "_PlayerGames"("B");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlayerGames" ADD CONSTRAINT "_PlayerGames_A_fkey" FOREIGN KEY ("A") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlayerGames" ADD CONSTRAINT "_PlayerGames_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
