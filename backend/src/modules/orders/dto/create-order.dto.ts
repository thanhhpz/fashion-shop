// src/modules/orders/dto/create-order.dto.ts
import {
  IsInt,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsInt()
  @Type(() => Number)
  bien_the_san_pham_id!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  so_luong!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  giam_gia?: number = 0;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  ma_giam_gia_id?: number;

  @IsInt()
  @Type(() => Number)
  phuong_thuc_thanh_toan_id!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  don_vi_van_chuyen_id?: number;

  @IsString()
  @MaxLength(100)
  ho_ten_nguoi_nhan!: string;

  @IsString()
  @MaxLength(20)
  so_dien_thoai_nguoi_nhan!: string;

  @IsString()
  dia_chi_giao_hang!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  province_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  ward_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ghi_chu?: string;

  @IsOptional()
  @IsBoolean()
  is_selected_all?: boolean = true;
}