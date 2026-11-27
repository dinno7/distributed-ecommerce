import { Injectable } from '@nestjs/common';
import {
  IdempotencyStorage,
  type IdempotencyAcquireResult,
  type IdempotencyStore,
  type IdempotencyStoredPayload,
} from '@nestjs/idempotency';
import { createHash } from 'node:crypto';
import { PrismaService } from '../infra/persistence/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaIdempotencyStore implements IdempotencyStore {
  constructor(
    private readonly db: PrismaService,
    storage: IdempotencyStorage,
  ) {
    storage.registerSource(this);
  }

  async acquire(
    key: string,
    owner: string,
    fingerprint: string,
    lockTtl: number,
  ): Promise<IdempotencyAcquireResult> {
    const hash = hashOf(key);
    // A second round only happens when the row was released or expired
    // between the two statements below.
    for (let attempt = 0; attempt < 5; attempt++) {
      const now = Date.now();
      const lock = {
        fingerprint,
        owner,
        response: null,
        expiresAt: now + lockTtl,
      };
      // Insert the lock, or take over an expired row. Of many concurrent
      // callers, PostgreSQL lets one write, and re-checks `setWhere` for the
      // others against the winner's row: they get no row back.
      const taken = await this.db.$executeRaw`
        INSERT INTO idempotency_keys (
          key_hash,
          key,
          fingerprint,
          owner,
          response,
          expires_at
        )
        VALUES (${hash}, ${key}, ${lock.fingerprint}, ${lock.owner}, NULL, ${lock.expiresAt})
        ON CONFLICT (key_hash) DO UPDATE
        SET
          fingerprint = EXCLUDED.fingerprint,
          owner = EXCLUDED.owner,
          response = NULL,
          expires_at = EXCLUDED.expires_at
        WHERE idempotency_keys.expires_at <= ${now}
      `;

      if (taken > 0) {
        return { state: 'acquired' };
      }

      // Someone else holds the key: report their lock or record.
      const row = await this.db.idempotencyKey.findUnique({
        where: { keyHash: hash },
      });

      // Someone else holds the key: report their lock or record.
      if (row && row.expiresAt > now) {
        return row.response === null
          ? { state: 'in-flight', fingerprint: row.fingerprint }
          : {
              state: 'completed',
              fingerprint: row.fingerprint,
              response: row.response as unknown as IdempotencyStoredPayload,
            };
      }
    }
    throw new Error(
      `The idempotency record for "${key}" kept changing; try again`,
    );
  }

  async complete(
    key: string,
    owner: string,
    response: IdempotencyStoredPayload,
    ttl: number,
  ): Promise<boolean> {
    const nowMs = Date.now();
    const { count } = await this.db.idempotencyKey.updateMany({
      where: this.ownedBy(key, owner, nowMs),
      data: {
        owner: null,
        response: response as unknown as Prisma.InputJsonValue,
        expiresAt: nowMs + ttl,
      },
    });
    return count === 1;
  }

  async release(key: string, owner: string): Promise<boolean> {
    const { count } = await this.db.idempotencyKey.deleteMany({
      where: this.ownedBy(key, owner, Date.now()),
    });
    return count === 1;
  }

  async extend(key: string, owner: string, lockTtl: number): Promise<boolean> {
    const nowMs = Date.now();
    const { count } = await this.db.idempotencyKey.updateMany({
      where: this.ownedBy(key, owner, nowMs),
      data: {
        expiresAt: nowMs + lockTtl,
      },
    });
    return count === 1;
  }

  /**
   * Deletes up to `limit` expired rows, for a scheduled job. Expired rows are
   * already ignored, and reused by the next request with the same key.
   */
  async prune(limit = 1000): Promise<number> {
    const nowMs = Date.now();
    return this.db.$executeRaw`
      DELETE FROM idempotency_keys
      WHERE key_hash IN (
        SELECT key_hash
        FROM idempotency_keys
        WHERE expires_at <= ${nowMs}
        LIMIT ${limit}
      )
      AND expires_at <= ${nowMs}
    `;
  }

  /** The caller's lock, if it still holds it and it hasn't expired. */
  private ownedBy(key: string, owner: string, now: number) {
    return {
      keyHash: hashOf(key),
      owner,
      expiresAt: { gt: now },
    };
  }
}

function hashOf(key: string) {
  return createHash('sha256').update(key).digest('hex');
}
