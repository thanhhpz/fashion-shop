// src/modules/orders/dto/update-order.dto.ts
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  trang_thai_don?: string;

  @IsOptional()
  @IsString()
  trang_thai_thanh_toan?: string;

  @IsOptional()
  @IsString()
  ma_van_don?: string;

  @IsOptional()
  @IsString()
  ghi_chu?: string;

  @IsOptional()
  @IsString()
  ho_ten_nguoi_nhan?: string;

  @IsOptional()
  @IsString()
  so_dien_thoai_nguoi_nhan?: string;

  @IsOptional()
  @IsString()
  dia_chi_giao_hang?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  don_vi_van_chuyen_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  phi_van_chuyen?: number;
}

export class UpdateOrderStatusDto {
  @IsString()
  trang_thai_don!: string;

  @IsOptional()
  @IsString()
  ghi_chu?: string;
}