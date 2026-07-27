import 'reflect-metadata';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { UnhandledExceptionFilter } from './common/filters/unhandled-exception.filter';
import { validateEnvironment } from './config/env.schema';
import { configureSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const environment = validateEnvironment(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: environment.REVIEW_BODY_LIMIT_BYTES }),
  );
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'result/:reviewId', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new UnhandledExceptionFilter(), new ApiExceptionFilter());
  configureSwagger(app);
  app.enableShutdownHooks();
  await app.listen(environment.PORT, '0.0.0.0');
}

void bootstrap();
