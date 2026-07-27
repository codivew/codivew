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

const CONTENT_SECURITY_POLICY =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

@Controller('reviews')
@UseGuards(ApiTokenGuard)
@ApiTags('reviews')
@ApiBearerAuth('review-api-token')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @ApiConsumes('application/json')
  @ApiProduces('text/html')
  @ApiCreatedResponse({
    description: 'UUID 파일명의 독립 실행형 HTML 코드 리뷰 보고서',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiUnauthorizedResponse({ description: 'Bearer 토큰 인증 실패' })
  @ApiBadRequestResponse({ description: 'DTO 검증 실패 또는 리뷰할 diff 없음' })
  @ApiPayloadTooLargeResponse({ description: '요청 본문 또는 필터링된 diff 크기 초과' })
  @ApiBadGatewayResponse({ description: '모델 응답 검증 실패' })
  @ApiServiceUnavailableResponse({ description: 'Ollama 연결 실패' })
  async create(@Body() dto: CreateReviewDto, @Res() reply: FastifyReply): Promise<FastifyReply> {
    const generated = await this.reviews.createReview(dto);
    return reply
      .header('Content-Type', 'text/html; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${generated.filename}"`)
      .header('Cache-Control', 'no-store')
      .header('Pragma', 'no-cache')
      .header('X-Content-Type-Options', 'nosniff')
      .header('Content-Security-Policy', CONTENT_SECURITY_POLICY)
      .header('Referrer-Policy', 'no-referrer')
      .header('X-Review-Id', generated.reviewId)
      .send(generated.html);
  }
}
