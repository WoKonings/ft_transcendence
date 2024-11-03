-- AlterEnum
ALTER TYPE "ChannelRole" ADD VALUE 'BANNED';

-- AlterTable
ALTER TABLE "UserChannel" ADD COLUMN     "timeout" TIMESTAMP(3);
