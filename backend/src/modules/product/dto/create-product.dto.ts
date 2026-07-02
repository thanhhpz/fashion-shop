// backend/src/modules/products/dto/create-product.dto.ts
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductVariantDto {
  @IsNumber()
  @Type(() => Number)
  kich_co_id!: number;

  @IsNumber()
  @Type(() => Number)
  mau_id!: number;

  @IsOptional()
  @IsString()
  variant_name?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  gia_ban!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  gia_nhap!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  gia_niem_yet!: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  so_luong_ton!: number;

  @IsOptional()
  @IsString()
  trang_thai?: string;
}

export class ProductImageDto {
  @IsString()
  duong_dan!: string;

  @IsOptional()
  @IsBoolean()
  la_anh_chinh?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  thu_tu?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bien_the_san_pham_id?: number;

  @IsOptional()
  @IsString()
  variant_sku?: string;
}

export class CreateProductDto {
  @IsString()
  ten_san_pham!: string;

  @IsOptional()
  @IsString()
  mo_ta?: string;

  @IsOptional()
  @IsString()
  mo_ta_ngan?: string;

  @IsNumber()
  @Type(() => Number)
  danh_muc_id!: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  thuong_hieu_id?: number;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  trong_luong?: number;

  @IsOptional()
  @IsString()
  trang_thai?: string;

  @IsOptional()
  @IsBoolean()
  noi_bat?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  @IsOptional()
  variants?: ProductVariantDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  @IsOptional()
  images?: ProductImageDto[];

  @IsArray()
  @IsOptional()
  tag_ids?: number[];
}