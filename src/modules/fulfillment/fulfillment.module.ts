import { Module } from '@nestjs/common';
import { DigitalModule } from './digital/digital.module';
import { PhysicalModule } from './physical/physical.module';
import { SubscriptionModule } from './subscription/subscription.module';

@Module({
  imports: [DigitalModule, SubscriptionModule, PhysicalModule],
  exports: [PhysicalModule],
})
export class FulfillmentModule {}
