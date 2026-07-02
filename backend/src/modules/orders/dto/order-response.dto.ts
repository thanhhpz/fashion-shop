// src/modules/orders/dto/order-response.dto.ts
export class OrderItemResponseDto {
  id!: number;
  bien_the_san_pham_id!: number;
  ten_san_pham!: string;
  ten_bien_the!: string | null;
  ten_mau!: string;
  ten_kich_co!: string;
  so_luong!: number;
  gia_ban_tai_thoi_diem!: number;
  giam_gia!: number;
  thanh_tien!: number;
  hinh_anh!: string | null;
}

export class OrderResponseDto {
  id!: number;
  ma_don_hang!: string;
  nguoi_dung_id!: number;
  tong_tien_hang!: number;
  tong_giam_gia!: number;
  phi_van_chuyen!: number;
  tong_thanh_toan!: number;
  trang_thai_don!: string;
  trang_thai_thanh_toan!: string;
  ho_ten_nguoi_nhan!: string;
  so_dien_thoai_nguoi_nhan!: string;
  dia_chi_giao_hang!: string;
  ghi_chu!: string | null;
  ma_van_don!: string | null;
  ngay_dat!: Date;
  ngay_giao_du_kien!: Date | null;
  items!: OrderItemResponseDto[];
  phuong_thuc_thanh_toan!: string;
  don_vi_van_chuyen?: string;
  created_at!: Date;
  updated_at!: Date;
}