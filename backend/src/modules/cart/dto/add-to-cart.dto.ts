// src/modules/cart/dto/add-to-cart.dto.ts
import { IsInt, IsOptional, Min, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @IsInt()
  @Type(() => Number)
  bien_the_san_pham_id!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  so_luong: number = 1;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_selected?: boolean = true;

  @IsOptional()
  @IsUUID()
  session_id?: string;
}