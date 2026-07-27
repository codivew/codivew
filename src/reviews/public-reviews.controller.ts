import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ApiNotFoundResponse, ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import { ERROR_CODES } from '../common/constants/error-codes';
import { ApiException } from '../common/errors/api-exception';
import { sendReviewHtml } from './review-response';
import { ReviewStoreService } from './review-store.service';

@Controller('reviews')
@ApiTags('reviews')
export class PublicReviewsController {
  constructor(private readonly store: ReviewStoreService) {}

  @Get(':reviewId.html')
  @ApiProduces('text/html')
  @ApiOkResponse({ description: '생성된 HTML 코드 리뷰 보고서' })
  @ApiNotFoundResponse({ description: '결과물이 없거나 메모리에서 제거됨' })
  getReview(
    @Param('reviewId', new ParseUUIDPipe({ version: '4' })) reviewId: string,
    @Res() reply: FastifyReply,
  ): FastifyReply {
    const html = this.store.get(reviewId);
    if (html === undefined) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.INVALID_REQUEST,
        '요청한 리뷰 결과물을 찾을 수 없습니다.',
      );
    }
    return sendReviewHtml(reply, reviewId, `${reviewId}.html`, html);
  }
}
