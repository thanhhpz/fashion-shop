// src/modules/wishlist/dto/wishlist.dto.ts
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToWishlistDto {
  @IsInt()
  @Type(() => Number)
  bien_the_san_pham_id!: number;
}

export class WishlistResponseDto {
  id!: number;
  nguoi_dung_id!: number;
  items!: WishlistItemDto[];
  totalItems!: number;
  created_at!: Date;
}

export class WishlistItemDto {
  id!: number;
  bien_the_san_pham_id!: number;
  ten_san_pham!: string;
  slug!: string;
  gia_ban!: number;
  gia_goc?: number;
  ten_mau!: string;
  ma_hex!: string;
  ten_kich_co!: string;
  anh_dai_dien!: string | null;
  ton_kho!: number;
  trang_thai!: string;
  created_at!: Date;
}

// dto/check-wishlist.dto.ts
export class CheckWishlistDto {
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  bien_the_san_pham_id?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  san_pham_id?: number;
}