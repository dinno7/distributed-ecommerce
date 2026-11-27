import { IsIn } from 'class-validator';

export class MockPaymentCallbackDto {
  @IsIn(['SUCCESS', 'DECLINE', 'TIMEOUT'])
  result: 'SUCCESS' | 'DECLINE' | 'TIMEOUT';
}
