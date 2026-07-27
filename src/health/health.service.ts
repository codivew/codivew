import { Injectable } from '@nestjs/common';
import { OllamaService } from '../reviews/ollama.service';

@Injectable()
export class HealthService {
  constructor(private readonly ollama: OllamaService) {}

  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  async ready(): Promise<
    { status: 'ready'; ollama: 'connected' } | { status: 'not_ready'; ollama: 'unavailable' }
  > {
    return (await this.ollama.isReady())
      ? { status: 'ready', ollama: 'connected' }
      : { status: 'not_ready', ollama: 'unavailable' };
  }
}
