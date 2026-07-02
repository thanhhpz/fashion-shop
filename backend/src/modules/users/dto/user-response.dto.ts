export class UserResponseDto {
  id!: number;
  ho_ten!: string;
  email!: string;
  so_dien_thoai?: string;
  ngay_sinh?: Date;
  gioi_tinh?: string;
  avatar?: string;
  trang_thai?: string;
  created_at?: Date;
  updated_at?: Date;
}