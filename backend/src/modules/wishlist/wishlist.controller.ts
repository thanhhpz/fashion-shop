// src/modules/wishlist/wishlist.controller.ts
import { Controller, Get, Post, Delete, Body, Param, Request, UseGuards, ParseIntPipe } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/wishlist.dto';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '../../common/decorators/public.decorator';

@Controller('wishlist')
@UseGuards(AuthGuard('jwt'))
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  // ============================================================
  // LẤY DANH SÁCH YÊU THÍCH
  // ============================================================
  @Get()
  async getWishlist(@Request() req) {
    const data = await this.wishlistService.getWishlist(req.user.id);
    return { success: true, data };
  }

  // ============================================================
  // THÊM VÀO YÊU THÍCH
  // ============================================================
  @Post('add')
  async addToWishlist(@Request() req, @Body() dto: AddToWishlistDto) {
    const data = await this.wishlistService.addToWishlist(req.user.id, dto);
    return { success: true, data };
  }

  // ============================================================
  // XÓA KHỎI YÊU THÍCH (THEO ITEM ID)
  // ============================================================
  @Delete('items/:id')
  async removeFromWishlist(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.wishlistService.removeFromWishlist(req.user.id, id);
    return { success: true, data };
  }

  // ============================================================
  // XÓA KHỎI YÊU THÍCH (THEO BIẾN THỂ ID)
  // ============================================================
  @Delete('variant/:variantId')
  async removeByVariantId(
    @Request() req,
    @Param('variantId', ParseIntPipe) variantId: number,
  ) {
    const data = await this.wishlistService.removeByVariantId(req.user.id, variantId);
    return { success: true, data };
  }

  // ============================================================
  // XÓA TOÀN BỘ YÊU THÍCH
  // ============================================================
  @Delete('clear')
  async clearWishlist(@Request() req) {
    const data = await this.wishlistService.clearWishlist(req.user.id);
    return { success: true, ...data };
  }

  // ============================================================
  // KIỂM TRA SẢN PHẨM ĐÃ YÊU THÍCH CHƯA
  // ============================================================
  @Get('check/:variantId')
  async checkWishlist(
    @Request() req,
    @Param('variantId', ParseIntPipe) variantId: number,
  ) {
    const data = await this.wishlistService.checkWishlist(req.user.id, variantId);
    return { success: true, data: { isWishlisted: data } };
  }

  // ============================================================
  // LẤY SỐ LƯỢNG SẢN PHẨM YÊU THÍCH
  // ============================================================
  @Get('count')
  async getWishlistCount(@Request() req) {
    const data = await this.wishlistService.getWishlistCount(req.user.id);
    return { success: true, data: { count: data } };
  }
}