// backend/src/modules/auth/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards, Request, Put } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const data = await this.authService.login(loginDto);
    return { success: true, data };
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req) {
    return { success: true, data: req.user };
  }

  @Put('change-password')
  @UseGuards(AuthGuard('jwt'))
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    await this.authService.changePassword(req.user.id, changePasswordDto);
    return { success: true, message: 'Đổi mật khẩu thành công' };
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Request() req) {
    console.log(`User ${req.user.email} logged out`);
    return { success: true, message: 'Đăng xuất thành công' };
  }
}