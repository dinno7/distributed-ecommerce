/*
  Warnings:

  - Added the required column `exchange_name` to the `orders_outbox` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders_outbox" ADD COLUMN     "exchange_name" TEXT NOT NULL;
