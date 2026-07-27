import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiTokenGuard } from '../common/guards/api-token.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
@UseGuards(ApiTokenGuard)
@ApiTags('reviews')
@ApiBearerAuth('review-api-token')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @ApiConsumes('application/json')
  @ApiProduces('text/plain')
  @ApiCreatedResponse({
    description: '생성된 HTML 코드 리뷰 보고서의 공개 URL',
    schema: {
      type: 'string',
      example: 'https://reviews.example.com/result/K4n2sP9_xQ7m',
    },
  })
  @ApiUnauthorizedResponse({ description: 'Bearer 토큰 인증 실패' })
  @ApiBadRequestResponse({ description: 'DTO 검증 실패 또는 리뷰할 diff 없음' })
  @ApiPayloadTooLargeResponse({ description: '요청 본문 또는 필터링된 diff 크기 초과' })
  @ApiBadGatewayResponse({ description: '모델 응답 검증 실패' })
  @ApiServiceUnavailableResponse({ description: 'Ollama 연결 실패' })
  async create(@Body() dto: CreateReviewDto, @Res() reply: FastifyReply): Promise<FastifyReply> {
    const generated = await this.reviews.createReview(dto);
    return reply
      .header('Content-Type', 'text/plain; charset=utf-8')
      .header('Location', generated.publicUrl)
      .header('Cache-Control', 'no-store')
      .header('X-Content-Type-Options', 'nosniff')
      .header('X-Review-Id', generated.reviewId)
      .send(generated.publicUrl);
  }
}
