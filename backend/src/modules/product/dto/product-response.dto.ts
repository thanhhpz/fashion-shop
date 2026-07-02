// backend/src/modules/products/dto/product-response.dto.ts
export class ProductVariantResponseDto {
  id!: number;
  kich_co_id!: number;
  ten_kich_co!: string;
  mau_id!: number;
  ten_mau!: string;
  ma_hex!: string;
  variant_name!: string | null;
  gia_ban!: number;
  gia_nhap!: number;
  gia_niem_yet!: number;
  sku!: string | null;
  trang_thai!: string | null;
  so_luong_ton!: number;
}

export class ProductImageResponseDto {
  id!: number;
  duong_dan!: string;
  la_anh_chinh!: boolean;
  thu_tu!: number | null;
}

export class ProductResponseDto {
  id!: number;
  ten_san_pham!: string;
  mo_ta!: string | null;
  mo_ta_ngan!: string | null;
  slug!: string;
  danh_muc_id!: number;
  ten_danh_muc!: string;
  thuong_hieu_id?: number | null;
  ten_thuong_hieu?: string | null;
  trang_thai!: string | null;
  luot_xem!: number;
  noi_bat!: boolean;
  created_at!: Date;
  updated_at!: Date;
  variants!: ProductVariantResponseDto[];
  images!: ProductImageResponseDto[];
}