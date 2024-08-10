-- CreateTable
CREATE TABLE "Channel" (
    "id" SERIAL NOT NULL,
    "users" INTEGER[],
    "messages" TEXT[],

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);
