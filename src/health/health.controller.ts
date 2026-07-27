import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@Controller()
@ApiTags('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  health(): { status: 'ok' } {
    return this.healthService.health();
  }

  @Get('ready')
  @ApiOkResponse({ schema: { example: { status: 'ready', ollama: 'connected' } } })
  @ApiServiceUnavailableResponse({
    schema: { example: { status: 'not_ready', ollama: 'unavailable' } },
  })
  async ready(@Res() reply: FastifyReply): Promise<FastifyReply> {
    const result = await this.healthService.ready();
    return reply
      .status(result.status === 'ready' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .send(result);
  }
}
