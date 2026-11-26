export const enum QUEUES {
  PaymentProcess = 'q.payment.process',
}

interface RetryQueue {
  queueName: string;
  ttlSeconds: number[];
}
export const RetryQueues: RetryQueue[] = [
  {
    ttlSeconds: [5, 30],
    queueName: QUEUES.PaymentProcess,
  },
];

export const DealLetterQueues: QUEUES[] = [QUEUES.PaymentProcess];
