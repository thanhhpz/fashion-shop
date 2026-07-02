// src/modules/users/users.service.ts
import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // Kiểm tra email đã tồn tại
    const existingUser = await this.prisma.nguoi_dung.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email đã tồn tại');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.mat_khau, 10);

    // Tạo user
    const user = await this.prisma.nguoi_dung.create({
      data: {
        ho_ten: createUserDto.ho_ten,
        email: createUserDto.email,
        mat_khau: hashedPassword,
        so_dien_thoai: createUserDto.so_dien_thoai,
        ngay_sinh: createUserDto.ngay_sinh ? new Date(createUserDto.ngay_sinh) : undefined,
        gioi_tinh: createUserDto.gioi_tinh,
        avatar: createUserDto.avatar,
        trang_thai: createUserDto.trang_thai || 'Hoạt động',
      },
    });

    // Gán role mặc định (Khách hàng)
    const khachHangRole = await this.prisma.vai_tro.findUnique({
      where: { ten_vai_tro: 'Khách hàng' },
    });

    if (khachHangRole) {
      await this.prisma.phan_quyen_nguoi_dung.create({
        data: {
          nguoi_dung_id: user.id,
          vai_tro_id: khachHangRole.id,
        },
      });
    }

    this.logger.log(`User created: ${user.email}`);

    // Remove password before returning
    const { mat_khau, ...result } = user;
    return result;
  }

  async findAll() {
    return this.prisma.nguoi_dung.findMany({
      select: {
        id: true,
        ho_ten: true,
        email: true,
        so_dien_thoai: true,
        ngay_sinh: true,
        gioi_tinh: true,
        avatar: true,
        trang_thai: true,
        created_at: true,
        updated_at: true,
        phan_quyen_nguoi_dung: {
          include: {
            vai_tro: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.nguoi_dung.findUnique({
      where: { id },
      include: {
        phan_quyen_nguoi_dung: {
          include: {
            vai_tro: true,
          },
        },
        dia_chi: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const { mat_khau, ...result } = user;
    return result;
  }

  async findByEmail(email: string) {
    return this.prisma.nguoi_dung.findUnique({
      where: { email },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);

    // Nếu có cập nhật password
    if (updateUserDto.mat_khau) {
      updateUserDto.mat_khau = await bcrypt.hash(updateUserDto.mat_khau, 10);
    }

    const updatedUser = await this.prisma.nguoi_dung.update({
      where: { id },
      data: {
        ho_ten: updateUserDto.ho_ten,
        email: updateUserDto.email,
        so_dien_thoai: updateUserDto.so_dien_thoai,
        ngay_sinh: updateUserDto.ngay_sinh ? new Date(updateUserDto.ngay_sinh) : undefined,
        gioi_tinh: updateUserDto.gioi_tinh,
        avatar: updateUserDto.avatar,
        trang_thai: updateUserDto.trang_thai,
        mat_khau: updateUserDto.mat_khau,
        updated_at: new Date(),
      },
    });

    this.logger.log(`User updated: ${updatedUser.email}`);

    const { mat_khau, ...result } = updatedUser;
    return result;
  }

  async remove(id: number) {
    const user = await this.findOne(id);

    // Soft delete - cập nhật deleted_at
    await this.prisma.nguoi_dung.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        trang_thai: 'Đã xóa',
      },
    });

    this.logger.log(`User deleted: ${user.email}`);
    return { message: 'Xóa người dùng thành công' };
  }

  async restore(id: number) {
    await this.findOne(id);

    await this.prisma.nguoi_dung.update({
      where: { id },
      data: {
        deleted_at: null,
        trang_thai: 'Hoạt động',
      },
    });

    return { message: 'Khôi phục người dùng thành công' };
  }

  async assignRole(userId: number, roleName: string) {
    const user = await this.findOne(userId);
    
    const role = await this.prisma.vai_tro.findUnique({
      where: { ten_vai_tro: roleName },
    });

    if (!role) {
      throw new NotFoundException('Không tìm thấy vai trò');
    }

    // Xóa role cũ
    await this.prisma.phan_quyen_nguoi_dung.deleteMany({
      where: { nguoi_dung_id: userId },
    });

    // Gán role mới
    await this.prisma.phan_quyen_nguoi_dung.create({
      data: {
        nguoi_dung_id: userId,
        vai_tro_id: role.id,
      },
    });

    this.logger.log(`Role ${roleName} assigned to user ${user.email}`);
    return { message: `Đã gán vai trò ${roleName} cho người dùng` };
  }
}