-- CreateEnum
CREATE TYPE "PetGender" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "bio" TEXT,
ADD COLUMN "notificationsReadAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Pet"
ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "gender" "PetGender",
ADD COLUMN "breed" TEXT,
ADD COLUMN "isNeutered" BOOLEAN;
