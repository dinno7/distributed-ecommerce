import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/infra/persistence/prisma.service';
import type { TransactionCtx } from '../../../../common/ports/transaction.port';
import type {
  Payment as PaymentRow,
  Prisma,
} from '../../../../generated/prisma/client.js';
import type { PaymentRepository } from '../../app/ports/payment.repository';
import { type Payment, PaymentStatus } from '../../domain/payment.entity';
import { PaymentMapper } from './payment.mapper';

@Injectable()
export class PaymentRepositoryPrisma implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payment: Payment, tx: TransactionCtx): Promise<boolean> {
    const transaction = tx as Prisma.TransactionClient;
    const {
      id,
      orderId,
      attempt,
      amountMinor,
      status,
      failureCode,
      gatewayName,
      checkoutUrl,
    } = PaymentMapper.toPersistence(payment);
    const inserted = await transaction.$executeRaw`
      INSERT INTO "payment" ("id", "order_id", "attempt", "amount_minor", "status", "failure_code", "gateway_name", "checkout_url")
      VALUES (${id}::uuid, ${orderId}::uuid, ${attempt}, ${amountMinor},
              ${status}::"PaymentStatus", ${failureCode}::"PaymentFailureCode", ${gatewayName}, ${checkoutUrl})
      ON CONFLICT ("order_id", "attempt") DO NOTHING
    `;
    return inserted === 1;
  }

  async findById(id: string): Promise<Payment | null> {
    const row = await this.prisma.payment.findUnique({ where: { id } });
    return row ? PaymentMapper.toDomain(row) : null;
  }

  async findLatestByOrderId(orderId: string): Promise<Payment | null> {
    const row = await this.prisma.payment.findFirst({
      where: { orderId },
      orderBy: { attempt: 'desc' },
    });
    return row ? PaymentMapper.toDomain(row) : null;
  }

  async findByIdForUpdate(
    id: string,
    tx: TransactionCtx,
  ): Promise<Payment | null> {
    const transaction = tx as Prisma.TransactionClient;
    const [row] = await transaction.$queryRaw<PaymentRow[]>`
      SELECT "id", "order_id" AS "orderId", "attempt", "amount_minor" AS "amountMinor",
             "status"::text AS "status", "failure_code"::text AS "failureCode",
             "gateway_name" AS "gatewayName", "checkout_url" AS "checkoutUrl"
      FROM "payment"
      WHERE "id" = ${id}::uuid
      FOR UPDATE
    `;
    return row ? PaymentMapper.toDomain(row) : null;
  }

  async findByOrderIdAndAttempt(
    orderId: string,
    attempt: number,
    tx: TransactionCtx,
  ): Promise<Payment | null> {
    const transaction = tx as Prisma.TransactionClient;
    const row = await transaction.payment.findUnique({
      where: { orderId_attempt: { orderId, attempt } },
    });
    return row ? PaymentMapper.toDomain(row) : null;
  }

  async update(payment: Payment, tx: TransactionCtx): Promise<void> {
    const transaction = tx as Prisma.TransactionClient;
    const { id, status, failureCode, checkoutUrl } =
      PaymentMapper.toPersistence(payment);
    await transaction.payment.update({
      where: { id, status: PaymentStatus.AWAITING_CUSTOMER },
      data: { status, failureCode, checkoutUrl },
    });
  }

  async setCheckoutUrl(
    id: string,
    checkoutUrl: string,
    tx: TransactionCtx,
  ): Promise<Payment> {
    const transaction = tx as Prisma.TransactionClient;
    const row = await transaction.payment.update({
      where: { id, status: PaymentStatus.AWAITING_CUSTOMER, checkoutUrl: null },
      data: { checkoutUrl },
    });
    return PaymentMapper.toDomain(row);
  }
}
