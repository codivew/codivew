import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('AI Code Review Server')
    .setDescription('Git diff를 Ollama로 리뷰하고 독립 실행형 HTML 보고서를 반환하는 API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'API token' },
      'review-api-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'AI Code Review API Docs',
    swaggerOptions: { persistAuthorization: true },
  });
}
