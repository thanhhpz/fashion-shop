// src/modules/cart/cart.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartResponseDto, CartItemDto } from './dto/cart-response.dto';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // LẤY GIỎ HÀNG CHO USER ĐÃ ĐĂNG NHẬP
  // ============================================================
  async getCart(userId: number): Promise<CartResponseDto> {
    let cart = await this.prisma.gio_hang.findUnique({
      where: { nguoi_dung_id: userId },
      include: {
        chi_tiet_gio_hang: {
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
        },
      },
    });

    if (!cart) {
      cart = await this.createCart(userId);
    }

    return this.formatCartResponse(cart);
  }

  // ============================================================
  // LẤY GIỎ HÀNG CHO SESSION (user chưa đăng nhập)
  // ============================================================
  async getCartBySession(sessionId: string): Promise<CartResponseDto> {
    let cart = await this.prisma.gio_hang_tam.findUnique({
      where: { id: sessionId },
      include: {
        chi_tiet_gio_hang_tam: {
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
        },
      },
    });

    // ✅ Nếu chưa có cart, tạo mới
    if (!cart) {
      cart = await this.prisma.gio_hang_tam.create({
        data: {
          id: sessionId,
          session_id: sessionId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
          created_at: new Date(),
        },
        include: {
          chi_tiet_gio_hang_tam: {
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
          },
        },
      });
    }

    // ✅ Kiểm tra và xóa sản phẩm hết hạn (cart đã không null)
    await this.cleanExpiredSessionItems(sessionId);

    // ✅ Lấy lại cart sau khi clean
    const updatedCart = await this.prisma.gio_hang_tam.findUnique({
      where: { id: sessionId },
      include: {
        chi_tiet_gio_hang_tam: {
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
        },
      },
    });

    // ✅ Format response với cart đã được đảm bảo không null
    return this.formatSessionCartResponse(updatedCart || cart);
  }

  // ============================================================
  // TẠO GIỎ HÀNG MỚI CHO USER
  // ============================================================
  async createCart(userId: number): Promise<any> {
    const cart = await this.prisma.gio_hang.create({
      data: {
        nguoi_dung_id: userId,
        ma_gio_hang: `CART-${userId}-${Date.now()}`,
        last_activity_at: new Date(),
      },
      include: {
        chi_tiet_gio_hang: {
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
        },
      },
    });

    this.logger.log(`Cart created for user ${userId}`);
    return cart;
  }

  // ============================================================
  // TẠO GIỎ HÀNG CHO SESSION
  // ============================================================
  async createSessionCart(sessionId: string): Promise<any> {
    const cart = await this.prisma.gio_hang_tam.create({
      data: {
        id: sessionId,
        session_id: sessionId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
        created_at: new Date(),
      },
      include: {
        chi_tiet_gio_hang_tam: {
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
        },
      },
    });

    this.logger.log(`Session cart created: ${sessionId}`);
    return cart;
  }

  // ============================================================
  // THÊM VÀO GIỎ HÀNG (USER ĐÃ ĐĂNG NHẬP)
  // ============================================================
    async addToCart(userId: number, dto: AddToCartDto): Promise<CartResponseDto> {
    const { bien_the_san_pham_id, so_luong, is_selected = true } = dto;

    // Kiểm tra biến thể sản phẩm
    const variant = await this.prisma.bien_the_san_pham.findUnique({
      where: { id: bien_the_san_pham_id },
      include: {
        san_pham: true,
        ton_kho: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Biến thể sản phẩm không tồn tại');
    }

    if (variant.trang_thai !== 'Còn hàng') {
      throw new BadRequestException('Sản phẩm đã hết hàng hoặc ngừng kinh doanh');
    }

    const tonKho = variant.ton_kho?.so_luong_ton || 0;
    if (so_luong > tonKho) {
      throw new BadRequestException(`Số lượng trong kho không đủ. Còn ${tonKho} sản phẩm`);
    }

    // ✅ Lấy hoặc tạo giỏ hàng
    let cart = await this.prisma.gio_hang.findUnique({
      where: { nguoi_dung_id: userId },
    });

    if (!cart) {
      cart = await this.prisma.gio_hang.create({
        data: {
          nguoi_dung_id: userId,
          ma_gio_hang: `CART-${userId}-${Date.now()}`,
          last_activity_at: new Date(),
        },
      });
    }

    // ✅ cart đã được đảm bảo không null ở đây
    // Kiểm tra sản phẩm đã có trong giỏ chưa
    const existingItem = await this.prisma.chi_tiet_gio_hang.findFirst({
      where: {
        gio_hang_id: cart.id, // ✅ cart đã không null
        bien_the_san_pham_id: bien_the_san_pham_id,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.so_luong + so_luong;
      if (newQuantity > tonKho) {
        throw new BadRequestException(`Số lượng trong kho không đủ. Còn ${tonKho} sản phẩm`);
      }

      await this.prisma.chi_tiet_gio_hang.update({
        where: { id: existingItem.id },
        data: {
          so_luong: newQuantity,
          is_selected: is_selected,
        },
      });
    } else {
      await this.prisma.chi_tiet_gio_hang.create({
        data: {
          gio_hang_id: cart.id,
          bien_the_san_pham_id: bien_the_san_pham_id,
          so_luong: so_luong,
          is_selected: is_selected,
        },
      });
    }

    // ✅ Cập nhật thời gian hoạt động
    await this.updateCartActivity(userId);

    this.logger.log(`Added ${so_luong} item(s) to cart for user ${userId}`);
    return this.getCart(userId);
  }

  // ============================================================
  // THÊM VÀO GIỎ HÀNG (SESSION - CHƯA ĐĂNG NHẬP)
  // ============================================================
    async addToSessionCart(sessionId: string, dto: AddToCartDto): Promise<CartResponseDto> {
    const { bien_the_san_pham_id, so_luong, is_selected = true } = dto;

    // Kiểm tra biến thể sản phẩm
    const variant = await this.prisma.bien_the_san_pham.findUnique({
      where: { id: bien_the_san_pham_id },
      include: {
        san_pham: true,
        ton_kho: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Biến thể sản phẩm không tồn tại');
    }

    if (variant.trang_thai !== 'Còn hàng') {
      throw new BadRequestException('Sản phẩm đã hết hàng hoặc ngừng kinh doanh');
    }

    const tonKho = variant.ton_kho?.so_luong_ton || 0;
    if (so_luong > tonKho) {
      throw new BadRequestException(`Số lượng trong kho không đủ. Còn ${tonKho} sản phẩm`);
    }

    // Lấy hoặc tạo giỏ hàng session
    let cart = await this.prisma.gio_hang_tam.findUnique({
      where: { id: sessionId },
    });

    if (!cart) {
      cart = await this.createSessionCart(sessionId);
    }

    // ✅ Dùng ! để TypeScript biết cart không null (vì đã kiểm tra và tạo mới)
    // Kiểm tra sản phẩm đã có trong giỏ chưa
    const existingItem = await this.prisma.chi_tiet_gio_hang_tam.findFirst({
      where: {
        gio_hang_tam_id: cart!.id, // ✅ Dùng non-null assertion
        bien_the_san_pham_id: bien_the_san_pham_id,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.so_luong + so_luong;
      if (newQuantity > tonKho) {
        throw new BadRequestException(`Số lượng trong kho không đủ. Còn ${tonKho} sản phẩm`);
      }

      await this.prisma.chi_tiet_gio_hang_tam.update({
        where: { id: existingItem.id },
        data: {
          so_luong: newQuantity,
          is_selected: is_selected,
        },
      });
    } else {
      await this.prisma.chi_tiet_gio_hang_tam.create({
        data: {
          gio_hang_tam_id: cart!.id, // ✅ Dùng non-null assertion
          bien_the_san_pham_id: bien_the_san_pham_id,
          so_luong: so_luong,
          is_selected: is_selected,
        },
      });
    }

    this.logger.log(`Added ${so_luong} item(s) to session cart ${sessionId}`);
    return this.getCartBySession(sessionId);
  }

  // ============================================================
  // CẬP NHẬT SỐ LƯỢNG (USER ĐÃ ĐĂNG NHẬP)
  // ============================================================
  async updateCartItem(
    userId: number,
    itemId: number,
    dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const { so_luong, is_selected } = dto;

    const item = await this.prisma.chi_tiet_gio_hang.findFirst({
      where: {
        id: itemId,
        gio_hang: { nguoi_dung_id: userId },
      },
      include: {
        bien_the_san_pham: {
          include: {
            ton_kho: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
    }

    if (so_luong <= 0) {
      await this.prisma.chi_tiet_gio_hang.delete({
        where: { id: itemId },
      });
    } else {
      const tonKho = item.bien_the_san_pham.ton_kho?.so_luong_ton || 0;
      if (so_luong > tonKho) {
        throw new BadRequestException(`Số lượng trong kho không đủ. Còn ${tonKho} sản phẩm`);
      }

      await this.prisma.chi_tiet_gio_hang.update({
        where: { id: itemId },
        data: {
          so_luong: so_luong,
          ...(is_selected !== undefined && { is_selected }),
        },
      });
    }

    await this.updateCartActivity(userId);
    return this.getCart(userId);
  }

  // ============================================================
  // CẬP NHẬT SỐ LƯỢNG (SESSION)
  // ============================================================
  async updateSessionCartItem(
    sessionId: string,
    itemId: number,
    dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const { so_luong, is_selected } = dto;

    const item = await this.prisma.chi_tiet_gio_hang_tam.findFirst({
      where: {
        id: itemId,
        gio_hang_tam: { id: sessionId },
      },
      include: {
        bien_the_san_pham: {
          include: {
            ton_kho: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
    }

    if (so_luong <= 0) {
      await this.prisma.chi_tiet_gio_hang_tam.delete({
        where: { id: itemId },
      });
    } else {
      const tonKho = item.bien_the_san_pham.ton_kho?.so_luong_ton || 0;
      if (so_luong > tonKho) {
        throw new BadRequestException(`Số lượng trong kho không đủ. Còn ${tonKho} sản phẩm`);
      }

      await this.prisma.chi_tiet_gio_hang_tam.update({
        where: { id: itemId },
        data: {
          so_luong: so_luong,
          ...(is_selected !== undefined && { is_selected }),
        },
      });
    }

    return this.getCartBySession(sessionId);
  }

  // ============================================================
  // XÓA SẢN PHẨM KHỎI GIỎ
  // ============================================================
  async removeFromCart(userId: number, itemId: number): Promise<CartResponseDto> {
    const item = await this.prisma.chi_tiet_gio_hang.findFirst({
      where: {
        id: itemId,
        gio_hang: { nguoi_dung_id: userId },
      },
    });

    if (!item) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
    }

    await this.prisma.chi_tiet_gio_hang.delete({
      where: { id: itemId },
    });

    await this.updateCartActivity(userId);
    return this.getCart(userId);
  }

  // ============================================================
  // XÓA SẢN PHẨM KHỎI GIỎ (SESSION)
  // ============================================================
  async removeFromSessionCart(sessionId: string, itemId: number): Promise<CartResponseDto> {
    const item = await this.prisma.chi_tiet_gio_hang_tam.findFirst({
      where: {
        id: itemId,
        gio_hang_tam: { id: sessionId },
      },
    });

    if (!item) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
    }

    await this.prisma.chi_tiet_gio_hang_tam.delete({
      where: { id: itemId },
    });

    return this.getCartBySession(sessionId);
  }

  // ============================================================
  // CHỌN/BỎ CHỌN SẢN PHẨM
  // ============================================================
  async toggleSelectItem(userId: number, itemId: number): Promise<CartResponseDto> {
    const item = await this.prisma.chi_tiet_gio_hang.findFirst({
      where: {
        id: itemId,
        gio_hang: { nguoi_dung_id: userId },
      },
    });

    if (!item) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
    }

    await this.prisma.chi_tiet_gio_hang.update({
      where: { id: itemId },
      data: { is_selected: !item.is_selected },
    });

    return this.getCart(userId);
  }

  // ============================================================
  // CHỌN/BỎ CHỌN TẤT CẢ
  // ============================================================
  async toggleSelectAll(userId: number, selected: boolean): Promise<CartResponseDto> {
    const cart = await this.prisma.gio_hang.findUnique({
      where: { nguoi_dung_id: userId },
    });

    if (!cart) {
      throw new NotFoundException('Không tìm thấy giỏ hàng');
    }

    await this.prisma.chi_tiet_gio_hang.updateMany({
      where: { gio_hang_id: cart.id },
      data: { is_selected: selected },
    });

    return this.getCart(userId);
  }

  // ============================================================
  // XÓA TOÀN BỘ GIỎ HÀNG
  // ============================================================
  async clearCart(userId: number): Promise<CartResponseDto> {
    const cart = await this.prisma.gio_hang.findUnique({
      where: { nguoi_dung_id: userId },
    });

    if (!cart) {
      throw new NotFoundException('Không tìm thấy giỏ hàng');
    }

    await this.prisma.chi_tiet_gio_hang.deleteMany({
      where: { gio_hang_id: cart.id },
    });

    await this.updateCartActivity(userId);
    return this.getCart(userId);
  }

  // ============================================================
  // MERGE GIỎ HÀNG SESSION VÀO USER
  // ============================================================
  async mergeSessionToUser(userId: number, sessionId: string): Promise<CartResponseDto> {
    // Lấy giỏ hàng session
    const sessionCart = await this.prisma.gio_hang_tam.findUnique({
      where: { id: sessionId },
      include: {
        chi_tiet_gio_hang_tam: true,
      },
    });

    if (!sessionCart || sessionCart.chi_tiet_gio_hang_tam.length === 0) {
      return this.getCart(userId);
    }

    // ✅ Lấy hoặc tạo giỏ hàng user
    let userCart = await this.prisma.gio_hang.findUnique({
      where: { nguoi_dung_id: userId },
    });

    // ✅ Nếu chưa có giỏ hàng, tạo mới
    if (!userCart) {
      userCart = await this.prisma.gio_hang.create({
        data: {
          nguoi_dung_id: userId,
          ma_gio_hang: `CART-${userId}-${Date.now()}`,
          last_activity_at: new Date(),
        },
      });
    }

    // ✅ Lúc này userCart đã được đảm bảo không null
    // Merge từng item
    for (const sessionItem of sessionCart.chi_tiet_gio_hang_tam) {
      const existingItem = await this.prisma.chi_tiet_gio_hang.findFirst({
        where: {
          gio_hang_id: userCart.id, // ✅ userCart đã không null
          bien_the_san_pham_id: sessionItem.bien_the_san_pham_id,
        },
      });

      // Kiểm tra tồn kho
      const variant = await this.prisma.bien_the_san_pham.findUnique({
        where: { id: sessionItem.bien_the_san_pham_id },
        include: { ton_kho: true },
      });

      const tonKho = variant?.ton_kho?.so_luong_ton || 0;

      if (existingItem) {
        const newQuantity = existingItem.so_luong + sessionItem.so_luong;
        if (newQuantity <= tonKho) {
          await this.prisma.chi_tiet_gio_hang.update({
            where: { id: existingItem.id },
            data: {
              so_luong: newQuantity,
              is_selected: sessionItem.is_selected,
            },
          });
        }
      } else {
        if (sessionItem.so_luong <= tonKho) {
          await this.prisma.chi_tiet_gio_hang.create({
            data: {
              gio_hang_id: userCart.id, // ✅ userCart đã không null
              bien_the_san_pham_id: sessionItem.bien_the_san_pham_id,
              so_luong: sessionItem.so_luong,
              is_selected: sessionItem.is_selected,
            },
          });
        }
      }
    }

    // Xóa session cart
    await this.prisma.chi_tiet_gio_hang_tam.deleteMany({
      where: { gio_hang_tam_id: sessionId },
    });

    await this.prisma.gio_hang_tam.delete({
      where: { id: sessionId },
    });

    // ✅ Cập nhật thời gian hoạt động
    await this.updateCartActivity(userId);

    this.logger.log(`Merged session cart ${sessionId} to user ${userId}`);
    return this.getCart(userId);
  }
  // ============================================================
  // LẤY SỐ LƯỢNG SẢN PHẨM TRONG GIỎ
  // ============================================================
  async getCartCount(userId: number): Promise<{ count: number }> {
    const cart = await this.prisma.gio_hang.findUnique({
      where: { nguoi_dung_id: userId },
      include: {
        chi_tiet_gio_hang: {
          select: {
            so_luong: true,
          },
        },
      },
    });

    if (!cart) {
      return { count: 0 };
    }

    const totalCount = cart.chi_tiet_gio_hang.reduce((sum, item) => sum + item.so_luong, 0);
    return { count: totalCount };
  }

  // ============================================================
  // XÓA SẢN PHẨM HẾT HẠN TRONG SESSION
  // ============================================================
  async cleanExpiredSessionItems(sessionId: string): Promise<void> {
    const cart = await this.prisma.gio_hang_tam.findUnique({
      where: { id: sessionId },
      include: {
        chi_tiet_gio_hang_tam: {
          include: {
            bien_the_san_pham: {
              include: {
                ton_kho: true,
              },
            },
          },
        },
      },
    });

    if (!cart) return;

    const expiredItems = cart.chi_tiet_gio_hang_tam.filter(
      item => item.bien_the_san_pham.trang_thai !== 'Còn hàng' ||
              (item.bien_the_san_pham.ton_kho?.so_luong_ton || 0) < 1
    );

    for (const item of expiredItems) {
      await this.prisma.chi_tiet_gio_hang_tam.delete({
        where: { id: item.id },
      });
    }

    if (expiredItems.length > 0) {
      this.logger.log(`Cleaned ${expiredItems.length} expired items from session ${sessionId}`);
    }
  }

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  // Cập nhật thời gian hoạt động của giỏ hàng
  private async updateCartActivity(userId: number): Promise<void> {
    const cart = await this.prisma.gio_hang.findUnique({
      where: { nguoi_dung_id: userId },
    });

    if (cart) {
      await this.prisma.gio_hang.update({
        where: { id: cart.id },
        data: { last_activity_at: new Date() },
      });
    }
  }

  // Format response cho user cart
  private formatCartResponse(cart: any): CartResponseDto {
    const items: CartItemDto[] = cart.chi_tiet_gio_hang.map((item: any) => {
      const variant = item.bien_the_san_pham;
      const tonKho = variant.ton_kho?.so_luong_ton || 0;
      const mainImage = variant.anh_san_pham?.[0]?.duong_dan || null;

      return {
        id: item.id,
        bien_the_san_pham_id: item.bien_the_san_pham_id,
        ten_san_pham: variant.san_pham.ten_san_pham,
        slug: variant.san_pham.slug,
        ten_mau: variant.mau_sac?.ten_mau || '',
        ma_hex: variant.mau_sac?.ma_hex || '',
        ten_kich_co: variant.kich_co?.ten_kich_co || '',
        gia_ban: variant.gia_ban,
        gia_goc: variant.gia_niem_yet || variant.gia_ban,
        so_luong: item.so_luong,
        thanh_tien: variant.gia_ban * item.so_luong,
        anh_dai_dien: mainImage,
        is_selected: item.is_selected ?? true,
        ton_kho: tonKho,
      };
    });

    const selectedItems = items.filter(item => item.is_selected);
    const tong_tien = items.reduce((sum, item) => sum + item.thanh_tien, 0);
    const tong_tien_chon = selectedItems.reduce((sum, item) => sum + item.thanh_tien, 0);
    const tong_so_luong = items.reduce((sum, item) => sum + item.so_luong, 0);
    const tong_so_luong_chon = selectedItems.reduce((sum, item) => sum + item.so_luong, 0);

    return {
      id: cart.id,
      ma_gio_hang: cart.ma_gio_hang,
      items,
      tong_tien,
      tong_tien_goc: tong_tien,
      tong_so_luong,
      tong_so_luong_chon,
      tong_tien_chon,
    };
  }

  // Format response cho session cart
  private formatSessionCartResponse(cart: any): CartResponseDto {
    const items: CartItemDto[] = cart.chi_tiet_gio_hang_tam.map((item: any) => {
      const variant = item.bien_the_san_pham;
      const tonKho = variant.ton_kho?.so_luong_ton || 0;
      const mainImage = variant.anh_san_pham?.[0]?.duong_dan || null;

      return {
        id: item.id,
        bien_the_san_pham_id: item.bien_the_san_pham_id,
        ten_san_pham: variant.san_pham.ten_san_pham,
        slug: variant.san_pham.slug,
        ten_mau: variant.mau_sac?.ten_mau || '',
        ma_hex: variant.mau_sac?.ma_hex || '',
        ten_kich_co: variant.kich_co?.ten_kich_co || '',
        gia_ban: variant.gia_ban,
        gia_goc: variant.gia_niem_yet || variant.gia_ban,
        so_luong: item.so_luong,
        thanh_tien: variant.gia_ban * item.so_luong,
        anh_dai_dien: mainImage,
        is_selected: item.is_selected ?? true,
        ton_kho: tonKho,
      };
    });

    const selectedItems = items.filter(item => item.is_selected);
    const tong_tien = items.reduce((sum, item) => sum + item.thanh_tien, 0);
    const tong_tien_chon = selectedItems.reduce((sum, item) => sum + item.thanh_tien, 0);
    const tong_so_luong = items.reduce((sum, item) => sum + item.so_luong, 0);
    const tong_so_luong_chon = selectedItems.reduce((sum, item) => sum + item.so_luong, 0);

    return {
      id: 0,
      ma_gio_hang: cart.id,
      items,
      tong_tien,
      tong_tien_goc: tong_tien,
      tong_so_luong,
      tong_so_luong_chon,
      tong_tien_chon,
    };
  }
}