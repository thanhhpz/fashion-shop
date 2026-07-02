// src/modules/search/dto/search.dto.ts
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum SearchSort {
  RELEVANCE = 'default',
  LATEST = 'latest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  BESTSELLER = 'bestseller',
  RATING = 'rating',
}

export class SearchDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value ?? '').trim())
  keyword?: string = '';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  limit?: number = 12;

  @IsOptional()
  @IsEnum(SearchSort)
  sort?: SearchSort = SearchSort.RELEVANCE;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(Number).filter(Boolean);
    }
    return Array.isArray(value) ? value : [];
  })
  @IsInt({ each: true })
  categoryIds?: number[];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(Number).filter(Boolean);
    }
    return Array.isArray(value) ? value : [];
  })
  @IsInt({ each: true })
  brandIds?: number[];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(Number).filter(Boolean);
    }
    return Array.isArray(value) ? value : [];
  })
  @IsInt({ each: true })
  colorIds?: number[];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(Number).filter(Boolean);
    }
    return Array.isArray(value) ? value : [];
  })
  @IsInt({ each: true })
  sizeIds?: number[];

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return undefined;
  })
  @IsBoolean()
  isSale?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return undefined;
  })
  @IsBoolean()
  inStock?: boolean;
}