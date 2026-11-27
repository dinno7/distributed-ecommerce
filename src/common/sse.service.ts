import { MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export class SseService {
  readonly #events = new Subject<MessageEvent>();

  emit(payload: MessageEvent) {
    this.#events.next(payload);
  }

  getStream(): Observable<MessageEvent> {
    return this.#events.asObservable();
  }
}
