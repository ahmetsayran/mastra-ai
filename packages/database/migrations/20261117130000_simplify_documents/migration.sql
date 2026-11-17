-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_owner_id_fkey";

-- DropIndex
DROP INDEX "documents_owner_id_idx";

-- DropIndex
DROP INDEX "documents_uuid_key";

-- AlterTable
ALTER TABLE "documents" DROP COLUMN "owner_id",
DROP COLUMN "status",
DROP COLUMN "title",
DROP COLUMN "updated_at",
DROP COLUMN "uuid";

-- AlterTable
ALTER TABLE "document_chunks" DROP COLUMN "chunk_index",
ALTER COLUMN "embedding" TYPE vector;

-- DropEnum
DROP TYPE "document_status";
