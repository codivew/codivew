import { Module } from '@nestjs/common';
import { ApiTokenGuard } from '../common/guards/api-token.guard';
import { DiffFilterService } from './diff-filter.service';
import { HtmlRendererService } from './html-renderer.service';
import { OllamaService } from './ollama.service';
import { ReviewPromptService } from './review-prompt.service';
import { PublicReviewsController } from './public-reviews.controller';
import { ReviewStoreService } from './review-store.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [ReviewsController, PublicReviewsController],
  providers: [
    ApiTokenGuard,
    DiffFilterService,
    ReviewPromptService,
    OllamaService,
    HtmlRendererService,
    ReviewStoreService,
    ReviewsService,
  ],
  exports: [OllamaService],
})
export class ReviewsModule {}
