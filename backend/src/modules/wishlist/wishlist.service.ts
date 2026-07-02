// src/modules/wishlist/wishlist.service.ts
import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToWishlistDto } from './dto/wishlist.dto';
import { WishlistResponseDto, WishlistItemDto } from './dto/wishlist.dto';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // LẤY DANH SÁCH YÊU THÍCH
  // ============================================================
  async getWishlist(userId: number): Promise<WishlistResponseDto> {
    // Tìm hoặc tạo wishlist cho user
    let wishlist = await this.prisma.yeu_thich.findUnique({
      where: { nguoi_dung_id: userId },
      include: {
        chi_tiet_yeu_thich: {
          include: {
            bien_the_san_pham: {
              include: {
                san_pham: true,
                mau_sac: true,
                kich_co: true,
                ton_kho: true,
                anh_san_pham: {
                  where: { la_anh_chinh: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!wishlist) {
      wishlist = await this.prisma.yeu_thich.create({
        data: {
          nguoi_dung_id: userId,
        },
        include: {
          chi_tiet_yeu_thich: {
            include: {
              bien_the_san_pham: {
                include: {
                  san_pham: true,
                  mau_sac: true,
                  kich_co: true,
                  ton_kho: true,
                  anh_san_pham: {
                    where: { la_anh_chinh: true },
                    take: 1,
                  },
                },
              },
            },
            orderBy: { created_at: 'desc' },
          },
        },
      });
    }

    return this.formatWishlistResponse(wishlist);
  }

  // ============================================================
  // THÊM SẢN PHẨM VÀO YÊU THÍCH
  // ============================================================
  async addToWishlist(userId: number, dto: AddToWishlistDto): Promise<WishlistResponseDto> {
    const { bien_the_san_pham_id } = dto;

    // Kiểm tra biến thể sản phẩm tồn tại
    const variant = await this.prisma.bien_the_san_pham.findUnique({
      where: { id: bien_the_san_pham_id },
      include: {
        san_pham: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // Kiểm tra sản phẩm đang bán
    if (variant.san_pham.trang_thai !== 'Đang bán') {
      throw new ConflictException('Sản phẩm hiện không có sẵn');
    }

    // Lấy hoặc tạo wishlist
    let wishlist = await this.prisma.yeu_thich.findUnique({
      where: { nguoi_dung_id: userId },
    });

    if (!wishlist) {
      wishlist = await this.prisma.yeu_thich.create({
        data: {
          nguoi_dung_id: userId,
        },
      });
    }

    // Kiểm tra sản phẩm đã có trong wishlist chưa
    const existingItem = await this.prisma.chi_tiet_yeu_thich.findFirst({
      where: {
        yeu_thich_id: wishlist.id,
        bien_the_san_pham_id: bien_the_san_pham_id,
      },
    });

    if (existingItem) {
      throw new ConflictException('Sản phẩm đã có trong danh sách yêu thích');
    }

    // Thêm vào wishlist
    await this.prisma.chi_tiet_yeu_thich.create({
      data: {
        yeu_thich_id: wishlist.id,
        bien_the_san_pham_id: bien_the_san_pham_id,
      },
    });

    this.logger.log(`Added product ${bien_the_san_pham_id} to wishlist for user ${userId}`);

    return this.getWishlist(userId);
  }

  // ============================================================
  // XÓA SẢN PHẨM KHỎI YÊU THÍCH
  // ============================================================
  async removeFromWishlist(userId: number, itemId: number): Promise<WishlistResponseDto> {
    // Kiểm tra item thuộc về user
    const item = await this.prisma.chi_tiet_yeu_thich.findFirst({
      where: {
        id: itemId,
        yeu_thich: {
          nguoi_dung_id: userId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Sản phẩm không có trong danh sách yêu thích');
    }

    await this.prisma.chi_tiet_yeu_thich.delete({
      where: { id: itemId },
    });

    this.logger.log(`Removed item ${itemId} from wishlist for user ${userId}`);

    return this.getWishlist(userId);
  }

  // ============================================================
  // XÓA SẢN PHẨM KHỎI YÊU THÍCH THEO BIẾN THỂ ID
  // ============================================================
  async removeByVariantId(userId: number, bienTheSanPhamId: number): Promise<WishlistResponseDto> {
    const item = await this.prisma.chi_tiet_yeu_thich.findFirst({
      where: {
        bien_the_san_pham_id: bienTheSanPhamId,
        yeu_thich: {
          nguoi_dung_id: userId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Sản phẩm không có trong danh sách yêu thích');
    }

    await this.prisma.chi_tiet_yeu_thich.delete({
      where: { id: item.id },
    });

    this.logger.log(`Removed variant ${bienTheSanPhamId} from wishlist for user ${userId}`);

    return this.getWishlist(userId);
  }

  // ============================================================
  // XÓA TOÀN BỘ YÊU THÍCH
  // ============================================================
  async clearWishlist(userId: number): Promise<{ message: string }> {
    const wishlist = await this.prisma.yeu_thich.findUnique({
      where: { nguoi_dung_id: userId },
    });

    if (!wishlist) {
      throw new NotFoundException('Không tìm thấy danh sách yêu thích');
    }

    await this.prisma.chi_tiet_yeu_thich.deleteMany({
      where: { yeu_thich_id: wishlist.id },
    });

    this.logger.log(`Cleared wishlist for user ${userId}`);
    return { message: 'Đã xóa toàn bộ danh sách yêu thích' };
  }

  // ============================================================
  // KIỂM TRA SẢN PHẨM ĐÃ YÊU THÍCH CHƯA
  // ============================================================
  async checkWishlist(userId: number, bienTheSanPhamId: number): Promise<boolean> {
    const wishlist = await this.prisma.yeu_thich.findUnique({
      where: { nguoi_dung_id: userId },
    });

    if (!wishlist) {
      return false;
    }

    const item = await this.prisma.chi_tiet_yeu_thich.findFirst({
      where: {
        yeu_thich_id: wishlist.id,
        bien_the_san_pham_id: bienTheSanPhamId,
      },
    });

    return !!item;
  }

  // ============================================================
  // LẤY SỐ LƯỢNG SẢN PHẨM YÊU THÍCH
  // ============================================================
  async getWishlistCount(userId: number): Promise<number> {
    const wishlist = await this.prisma.yeu_thich.findUnique({
      where: { nguoi_dung_id: userId },
      include: {
        chi_tiet_yeu_thich: {
          select: { id: true },
        },
      },
    });

    if (!wishlist) {
      return 0;
    }

    return wishlist.chi_tiet_yeu_thich.length;
  }

  // ============================================================
  // FORMAT RESPONSE
  // ============================================================
  private formatWishlistResponse(wishlist: any): WishlistResponseDto {
    const items: WishlistItemDto[] = wishlist.chi_tiet_yeu_thich.map((item: any) => {
      const variant = item.bien_the_san_pham;
      const tonKho = variant.ton_kho?.so_luong_ton || 0;
      const mainImage = variant.anh_san_pham?.[0]?.duong_dan || null;

      return {
        id: item.id,
        bien_the_san_pham_id: item.bien_the_san_pham_id,
        ten_san_pham: variant.san_pham.ten_san_pham,
        slug: variant.san_pham.slug,
        gia_ban: variant.gia_ban,
        gia_goc: variant.gia_niem_yet || variant.gia_ban,
        ten_mau: variant.mau_sac?.ten_mau || '',
        ma_hex: variant.mau_sac?.ma_hex || '',
        ten_kich_co: variant.kich_co?.ten_kich_co || '',
        anh_dai_dien: mainImage,
        ton_kho: tonKho,
        trang_thai: variant.san_pham.trang_thai || 'Đang bán',
        created_at: item.created_at || new Date(),
      };
    });

    return {
      id: wishlist.id,
      nguoi_dung_id: wishlist.nguoi_dung_id,
      items,
      totalItems: items.length,
      created_at: wishlist.created_at || new Date(),
    };
  }
}