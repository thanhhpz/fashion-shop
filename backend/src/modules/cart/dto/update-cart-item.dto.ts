// src/modules/cart/dto/update-cart-item.dto.ts
import { IsInt, IsOptional, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  so_luong!: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_selected?: boolean;
}