import { Module } from '@nestjs/common';
import { ReviewsModule } from '../reviews/reviews.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [ReviewsModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
