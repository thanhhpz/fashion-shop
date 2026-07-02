// backend/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.nguoi_dung.findFirst({
      where: { email },
      include: {
        phan_quyen_nguoi_dung: {
          include: { vai_tro: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await bcrypt.compare(password, user.mat_khau);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      ho_ten: user.ho_ten,
      role: user.phan_quyen_nguoi_dung?.[0]?.vai_tro?.ten_vai_tro || 'Khách hàng',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        ho_ten: user.ho_ten,
        email: user.email,
        vai_tro: user.phan_quyen_nguoi_dung?.[0]?.vai_tro?.ten_vai_tro || 'Khách hàng',
      },
    };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const { old_password, new_password, confirm_password } = changePasswordDto;

    if (new_password !== confirm_password) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    if (old_password === new_password) {
      throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu cũ');
    }

    const user = await this.prisma.nguoi_dung.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    const isPasswordValid = await bcrypt.compare(old_password, user.mat_khau);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu cũ không đúng');
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await this.prisma.nguoi_dung.update({
      where: { id: userId },
      data: {
        mat_khau: hashedPassword,
        updated_at: new Date(),
      },
    });

    this.logger.log(`User ${user.email} changed password successfully`);
    return { success: true, message: 'Đổi mật khẩu thành công' };
  }
}