import { AmqpConnection, RpcTimeoutError } from '@golevelup/nestjs-rabbitmq';
import { MessageRequestTimeoutError } from '../ports/message-publisher.port';
import { RabbitMQTopicPublisher } from './rabbitmq.publisher';

describe('RabbitMQTopicPublisher requests', () => {
  const route = { exchange: 'x.rpc', routingKey: 'rpc.test' };
  const message = { ...route, payload: { id: 'example' } };
  const request = jest.fn();
  const publisher = new RabbitMQTopicPublisher({
    request,
  } as unknown as AmqpConnection);

  beforeEach(() => request.mockReset());

  it('limits both publishing and reply wait and expires queued requests', async () => {
    request.mockResolvedValueOnce({ ok: true });

    await expect(publisher.request(message)).resolves.toEqual({ ok: true });
    expect(request).toHaveBeenCalledWith({
      ...message,
      timeout: 5_000,
      expiration: '5000',
      publishOptions: { timeout: 5_000, contentType: 'application/json' },
    });
  });

  it('translates RabbitMQ reply timeouts', async () => {
    const cause = new RpcTimeoutError(100, route.exchange, route.routingKey);
    request.mockRejectedValueOnce(cause);

    const result = publisher.request({ ...message, timeoutMs: 100 });
    await expect(result).rejects.toBeInstanceOf(MessageRequestTimeoutError);
    await expect(result).rejects.toMatchObject({ cause });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 100, expiration: '100' }),
    );
  });

  it('rejects invalid deadlines before sending', async () => {
    await expect(
      publisher.request({ ...message, timeoutMs: 0 }),
    ).rejects.toBeInstanceOf(RangeError);
    expect(request).not.toHaveBeenCalled();
  });
});
