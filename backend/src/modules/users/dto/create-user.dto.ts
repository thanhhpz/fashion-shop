// src/modules/users/dto/create-user.dto.ts
import { IsString, IsEmail, IsOptional, IsDateString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  ho_ten!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  mat_khau!: string;

  @IsOptional()
  @IsString()
  so_dien_thoai?: string;

  @IsOptional()
  @IsDateString()
  ngay_sinh?: string;

  @IsOptional()
  @IsString()
  gioi_tinh?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  trang_thai?: string;
}