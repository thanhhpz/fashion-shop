// src/modules/cart/cart.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards, Headers, ParseIntPipe } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '../../common/decorators/public.decorator';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ============================================================
  // USER ĐÃ ĐĂNG NHẬP
  // ============================================================

  // Lấy giỏ hàng
  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getCart(@Request() req) {
    const data = await this.cartService.getCart(req.user.id);
    return { success: true, data };
  }

  // Thêm vào giỏ hàng
  @Post('add')
  @UseGuards(AuthGuard('jwt'))
  async addToCart(@Request() req, @Body() dto: AddToCartDto) {
    const data = await this.cartService.addToCart(req.user.id, dto);
    return { success: true, data };
  }

  // Cập nhật số lượng
  @Put('items/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateCartItem(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    const data = await this.cartService.updateCartItem(req.user.id, id, dto);
    return { success: true, data };
  }

  // Xóa sản phẩm khỏi giỏ
  @Delete('items/:id')
  @UseGuards(AuthGuard('jwt'))
  async removeFromCart(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.cartService.removeFromCart(req.user.id, id);
    return { success: true, data };
  }

  // Chọn/bỏ chọn sản phẩm
  @Put('items/:id/toggle-select')
  @UseGuards(AuthGuard('jwt'))
  async toggleSelectItem(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.cartService.toggleSelectItem(req.user.id, id);
    return { success: true, data };
  }

  // Chọn/bỏ chọn tất cả
  @Put('select-all')
  @UseGuards(AuthGuard('jwt'))
  async toggleSelectAll(
    @Request() req,
    @Body('selected') selected: boolean,
  ) {
    const data = await this.cartService.toggleSelectAll(req.user.id, selected);
    return { success: true, data };
  }

  // Xóa toàn bộ giỏ hàng
  @Delete('clear')
  @UseGuards(AuthGuard('jwt'))
  async clearCart(@Request() req) {
    const data = await this.cartService.clearCart(req.user.id);
    return { success: true, data };
  }

  // Lấy số lượng sản phẩm trong giỏ
  @Get('count')
  @UseGuards(AuthGuard('jwt'))
  async getCartCount(@Request() req) {
    const data = await this.cartService.getCartCount(req.user.id);
    return { success: true, data };
  }

  // ============================================================
  // SESSION (CHƯA ĐĂNG NHẬP) - PUBLIC
  // ============================================================

  // Lấy giỏ hàng session
  @Public()
  @Get('session')
  async getCartBySession(@Headers('x-session-id') sessionId: string) {
    if (!sessionId) {
      return { success: true, data: null, message: 'Session ID is required' };
    }
    const data = await this.cartService.getCartBySession(sessionId);
    return { success: true, data };
  }

  // Thêm vào giỏ hàng session
  @Public()
  @Post('session/add')
  async addToSessionCart(
    @Headers('x-session-id') sessionId: string,
    @Body() dto: AddToCartDto,
  ) {
    if (!sessionId) {
      return { success: false, message: 'Session ID is required' };
    }
    const data = await this.cartService.addToSessionCart(sessionId, dto);
    return { success: true, data };
  }

  // Cập nhật giỏ hàng session
  @Public()
  @Put('session/items/:id')
  async updateSessionCartItem(
    @Headers('x-session-id') sessionId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    if (!sessionId) {
      return { success: false, message: 'Session ID is required' };
    }
    const data = await this.cartService.updateSessionCartItem(sessionId, id, dto);
    return { success: true, data };
  }

  // Xóa sản phẩm khỏi giỏ hàng session
  @Public()
  @Delete('session/items/:id')
  async removeFromSessionCart(
    @Headers('x-session-id') sessionId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (!sessionId) {
      return { success: false, message: 'Session ID is required' };
    }
    const data = await this.cartService.removeFromSessionCart(sessionId, id);
    return { success: true, data };
  }

  // ============================================================
  // MERGE GIỎ HÀNG
  // ============================================================

  // Merge session cart vào user cart (khi đăng nhập)
  @Post('merge')
  @UseGuards(AuthGuard('jwt'))
  async mergeCart(
    @Request() req,
    @Body() mergeDto: MergeCartDto,
  ) {
    const data = await this.cartService.mergeSessionToUser(req.user.id, mergeDto.session_id);
    return { success: true, data };
  }
}