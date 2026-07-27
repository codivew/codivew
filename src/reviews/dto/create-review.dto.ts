import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReviewMode {
  WORKING = 'working',
  STAGED = 'staged',
  BRANCH = 'branch',
}

export class CreateReviewDto {
  @ApiProperty({ example: 'my-project', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  repository!: string;

  @ApiPropertyOptional({ example: 'main', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  baseBranch?: string;

  @ApiProperty({ enum: ReviewMode, example: ReviewMode.STAGED })
  @IsEnum(ReviewMode)
  mode!: ReviewMode;

  @ApiPropertyOptional({ example: 'abc1234', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  commitSha?: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 20,
    example: ['NestJS API', 'PostgreSQL을 사용하지 않음'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  projectContext?: string[];

  @ApiProperty({
    description: '표준 diff --git 형식의 Git diff',
    example: 'diff --git a/src/app.ts b/src/app.ts\n--- a/src/app.ts\n+++ b/src/app.ts',
  })
  @IsString()
  @IsNotEmpty()
  diff!: string;
}
