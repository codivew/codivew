import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({ imports: [ConfigModule, ReviewsModule, HealthModule] })
export class AppModule {}
