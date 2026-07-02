// src/modules/cart/dto/cart-response.dto.ts
export class CartItemDto {
  id!: number;
  bien_the_san_pham_id!: number;
  ten_san_pham!: string;
  slug!: string;
  ten_mau!: string;
  ma_hex!: string;
  ten_kich_co!: string;
  gia_ban!: number;
  gia_goc?: number;
  so_luong!: number;
  thanh_tien!: number;
  anh_dai_dien!: string | null;
  is_selected!: boolean;
  ton_kho!: number;
}

export class CartResponseDto {
  id!: number;
  ma_gio_hang!: string;
  items!: CartItemDto[];
  tong_tien!: number;
  tong_tien_goc?: number;
  tong_so_luong!: number;
  tong_so_luong_chon!: number;
  tong_tien_chon!: number;
  giam_gia?: number;
  tong_thanh_toan?: number;
}