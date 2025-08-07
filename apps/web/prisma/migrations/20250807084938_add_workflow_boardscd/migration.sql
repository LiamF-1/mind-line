-- CreateEnum
CREATE TYPE "public"."ExternalType" AS ENUM ('TASK', 'EVENT');

-- CreateTable
CREATE TABLE "public"."boards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deadline" TIMESTAMP(3),
    "theme" TEXT DEFAULT '#3b82f6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."board_items" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "external_type" "public"."ExternalType" NOT NULL,
    "x_pos" DOUBLE PRECISION NOT NULL,
    "y_pos" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "board_id" TEXT NOT NULL,

    CONSTRAINT "board_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."board_edges" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "board_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,

    CONSTRAINT "board_edges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "board_items_board_id_external_id_external_type_key" ON "public"."board_items"("board_id", "external_id", "external_type");

-- CreateIndex
CREATE UNIQUE INDEX "board_edges_source_id_target_id_key" ON "public"."board_edges"("source_id", "target_id");

-- AddForeignKey
ALTER TABLE "public"."boards" ADD CONSTRAINT "boards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."board_items" ADD CONSTRAINT "board_items_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."board_edges" ADD CONSTRAINT "board_edges_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."board_edges" ADD CONSTRAINT "board_edges_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."board_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."board_edges" ADD CONSTRAINT "board_edges_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."board_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
