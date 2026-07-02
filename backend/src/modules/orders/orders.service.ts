// src/modules/orders/orders.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import { UpdateOrderDto, UpdateOrderStatusDto } from './dto/update-order.dto';
import { OrderResponseDto, OrderItemResponseDto } from './dto/order-response.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // TẠO ĐƠN HÀNG
  // ============================================================
  async createOrder(userId: number, dto: CreateOrderDto): Promise<OrderResponseDto> {
    const {
      items,
      ma_giam_gia_id,
      phuong_thuc_thanh_toan_id,
      don_vi_van_chuyen_id,
      ho_ten_nguoi_nhan,
      so_dien_thoai_nguoi_nhan,
      dia_chi_giao_hang,
      province_code,
      ward_code,
      ghi_chu,
    } = dto;

    // 1. Kiểm tra items
    if (!items || items.length === 0) {
      throw new BadRequestException('Đơn hàng không có sản phẩm');
    }

    // 2. Kiểm tra phương thức thanh toán
    const phuongThucThanhToan = await this.prisma.phuong_thuc_thanh_toan.findUnique({
      where: { id: phuong_thuc_thanh_toan_id, trang_thai: 'Hoạt động' },
    });

    if (!phuongThucThanhToan) {
      throw new NotFoundException('Phương thức thanh toán không hợp lệ');
    }

    // 3. Khai báo biến
    let tongTienHang = 0;
    let tongGiamGia = 0;
    let giamGiaVoucher = 0;
    let voucher: any = null;
    let voucherId: number | null = null;
    const orderItems: any[] = [];

    // 4. Kiểm tra voucher nếu có
    if (ma_giam_gia_id) {
      voucher = await this.prisma.ma_giam_gia.findUnique({
        where: {
          id: ma_giam_gia_id,
          trang_thai: 'Hoạt động',
          ngay_bat_dau: { lte: new Date() },
          ngay_ket_thuc: { gte: new Date() },
        },
      });

      if (!voucher) {
        throw new NotFoundException('Mã giảm giá không hợp lệ hoặc đã hết hạn');
      }

      voucherId = voucher.id;

      // Kiểm tra số lần sử dụng
      const usedCount = await this.prisma.voucher_usage.count({
        where: { ma_giam_gia_id: voucher.id },
      });

      const maxUses = voucher.so_luong || 0;
      if (usedCount >= maxUses && maxUses > 0) {
        throw new BadRequestException('Mã giảm giá đã hết số lần sử dụng');
      }

      // Kiểm tra user đã dùng chưa
      const userUsed = await this.prisma.voucher_usage.findFirst({
        where: {
          ma_giam_gia_id: voucher.id,
          nguoi_dung_id: userId,
        },
      });

      if (userUsed) {
        throw new BadRequestException('Bạn đã sử dụng mã giảm giá này');
      }
    }

    // 5. Lấy thông tin các biến thể và tính toán
    for (const item of items) {
      const variant = await this.prisma.bien_the_san_pham.findUnique({
        where: { id: item.bien_the_san_pham_id },
        include: {
          san_pham: true,
          kich_co: true,
          mau_sac: true,
          ton_kho: true,
          anh_san_pham: {
            where: { la_anh_chinh: true },
            take: 1,
          },
        },
      });

      if (!variant) {
        throw new NotFoundException(
          `Biến thể sản phẩm ${item.bien_the_san_pham_id} không tồn tại`
        );
      }

      if (variant.trang_thai !== 'Còn hàng') {
        throw new BadRequestException(`Sản phẩm ${variant.san_pham.ten_san_pham} đã hết hàng`);
      }

      // Kiểm tra tồn kho
      const tonKho = variant.ton_kho?.so_luong_ton ?? 0;
      if (item.so_luong > tonKho) {
        throw new BadRequestException(
          `Số lượng sản phẩm ${variant.san_pham.ten_san_pham} không đủ. Còn ${tonKho}`
        );
      }

      // Tính tiền
      const giaBan = variant.gia_ban;
      const thanhTien = giaBan * item.so_luong;
      const giamGiaItem = item.giam_gia || 0;

      tongTienHang += thanhTien;
      tongGiamGia += giamGiaItem * item.so_luong;

      const mainImage = variant.anh_san_pham?.[0]?.duong_dan || null;

      orderItems.push({
        bien_the_san_pham_id: item.bien_the_san_pham_id,
        so_luong: item.so_luong,
        gia_ban_tai_thoi_diem: giaBan,
        giam_gia: giamGiaItem,
        thanh_tien: thanhTien - giamGiaItem * item.so_luong,
        ten_bien_the: variant.variant_name || '',
        ma_sku: variant.sku || '',
        hinh_anh: mainImage,
        ten_san_pham: variant.san_pham.ten_san_pham,
        ten_mau: variant.mau_sac?.ten_mau || '',
        ten_kich_co: variant.kich_co?.ten_kich_co || '',
      });

      // Cập nhật tồn kho
      if (variant.ton_kho) {
        const currentTon = variant.ton_kho.so_luong_ton ?? 0;
        const currentChoXuat = variant.ton_kho.so_luong_cho_xuat ?? 0;

        await this.prisma.ton_kho.update({
          where: { bien_the_san_pham_id: variant.id },
          data: {
            so_luong_ton: currentTon - item.so_luong,
            so_luong_cho_xuat: currentChoXuat + item.so_luong,
            ngay_cap_nhat: new Date(),
          },
        });
      }

      // Lưu lịch sử tồn kho
      await this.prisma.lich_su_ton_kho.create({
        data: {
          bien_the_san_pham_id: variant.id,
          so_luong_thay_doi: -item.so_luong,
          so_luong_ton_sau: (variant.ton_kho?.so_luong_ton ?? 0) - item.so_luong,
          loai_thay_doi: 'XUAT_KHO_DON_HANG',
          ghi_chu: `Đặt hàng - User ${userId}`,
          nguoi_thuc_hien: userId,
        },
      });
    }

    // 6. Áp dụng voucher
    if (voucher) {
      if (voucher.loai_giam === 'percent') {
        giamGiaVoucher = Math.min(
          Math.floor(tongTienHang * (voucher.gia_tri_giam / 100)),
          voucher.giam_toi_da || tongTienHang
        );
      } else {
        giamGiaVoucher = Math.min(voucher.gia_tri_giam, tongTienHang);
      }

      if (voucher.dieu_kien_toi_thieu && tongTienHang < voucher.dieu_kien_toi_thieu) {
        throw new BadRequestException(
          `Đơn hàng tối thiểu ${voucher.dieu_kien_toi_thieu}đ để sử dụng mã này`
        );
      }
    }

    tongGiamGia += giamGiaVoucher;

    // 7. Tính phí vận chuyển
    let phiVanChuyen = 0;
    if (don_vi_van_chuyen_id) {
      phiVanChuyen = 30000;
    }

    // 8. Tạo mã đơn hàng
    const maDonHang = `DH-${Date.now()}-${userId}`;

    // 9. Tạo đơn hàng
    const order = await this.prisma.don_hang.create({
      data: {
        ma_don_hang: maDonHang,
        nguoi_dung_id: userId,
        ma_giam_gia_id: voucherId,
        phuong_thuc_thanh_toan_id: phuong_thuc_thanh_toan_id,
        don_vi_van_chuyen_id: don_vi_van_chuyen_id,
        tong_tien_hang: tongTienHang,
        tong_giam_gia: tongGiamGia,
        phi_van_chuyen: phiVanChuyen,
        tong_thanh_toan: tongTienHang - tongGiamGia + phiVanChuyen,
        ho_ten_nguoi_nhan,
        so_dien_thoai_nguoi_nhan,
        dia_chi_giao_hang,
        province_code,
        ward_code,
        ghi_chu: ghi_chu || '',
        trang_thai_don: 'Chờ xác nhận',
        trang_thai_thanh_toan:
          phuong_thuc_thanh_toan_id === 1 ? 'Chưa thanh toán' : 'Chờ xác nhận',
        ngay_dat: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // 10. Tạo chi tiết đơn hàng
    for (const item of orderItems) {
      await this.prisma.chi_tiet_don_hang.create({
        data: {
          don_hang_id: order.id,
          bien_the_san_pham_id: item.bien_the_san_pham_id,
          so_luong: item.so_luong,
          gia_ban_tai_thoi_diem: item.gia_ban_tai_thoi_diem,
          giam_gia: item.giam_gia,
          thanh_tien: item.thanh_tien,
          ten_bien_the: item.ten_bien_the,
          ma_sku: item.ma_sku,
          hinh_anh: item.hinh_anh,
        },
      });
    }

    // 11. Lưu lịch sử trạng thái
    await this.prisma.lich_su_trang_thai_don.create({
      data: {
        don_hang_id: order.id,
        trang_thai_moi: 'Chờ xác nhận',
        ghi_chu: 'Tạo đơn hàng',
        nguoi_thay_doi: `User ${userId}`,
        created_at: new Date(),
      },
    });

    // 12. Xóa giỏ hàng
    await this.prisma.chi_tiet_gio_hang.deleteMany({
      where: {
        gio_hang: {
          nguoi_dung_id: userId,
        },
      },
    });

    // 13. Lưu voucher usage
    if (voucher && voucherId) {
      await this.prisma.voucher_usage.create({
        data: {
          ma_giam_gia_id: voucherId,
          nguoi_dung_id: userId,
          don_hang_id: order.id,
          so_tien_giam: giamGiaVoucher,
          used_at: new Date(),
        },
      });

      await this.prisma.ma_giam_gia.update({
        where: { id: voucherId },
        data: {
          so_luong_da_dung: { increment: 1 },
        },
      });
    }

    this.logger.log(`Order created: ${maDonHang} by user ${userId}`);

    return this.getOrderDetail(order.id);
  }

  // ============================================================
  // LẤY CHI TIẾT ĐƠN HÀNG
  // ============================================================
  async getOrderDetail(orderId: number): Promise<OrderResponseDto> {
    const order = await this.prisma.don_hang.findUnique({
      where: { id: orderId },
      include: {
        chi_tiet_don_hang: {
          include: {
            bien_the_san_pham: {
              include: {
                san_pham: true,
                mau_sac: true,
                kich_co: true,
                anh_san_pham: {
                  where: { la_anh_chinh: true },
                  take: 1,
                },
              },
            },
          },
        },
        phuong_thuc_thanh_toan: true,
        don_vi_van_chuyen: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return this.formatOrderResponse(order);
  }

  // ============================================================
  // LẤY DANH SÁCH ĐƠN HÀNG CỦA USER
  // ============================================================
  async getUserOrders(
    userId: number,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<{ orders: OrderResponseDto[]; total: number; totalPages: number }> {
    const where: any = {
      nguoi_dung_id: userId,
    };

    if (status) {
      where.trang_thai_don = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.don_hang.findMany({
        where,
        include: {
          chi_tiet_don_hang: {
            include: {
              bien_the_san_pham: {
                include: {
                  san_pham: true,
                  mau_sac: true,
                  kich_co: true,
                  anh_san_pham: {
                    where: { la_anh_chinh: true },
                    take: 1,
                  },
                },
              },
            },
          },
          phuong_thuc_thanh_toan: true,
          don_vi_van_chuyen: true,
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.don_hang.count({ where }),
    ]);

    return {
      orders: orders.map((order: any) => this.formatOrderResponse(order)),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================
  // LẤY TẤT CẢ ĐƠN HÀNG (ADMIN)
  // ============================================================
  async getAllOrders(
    page: number = 1,
    limit: number = 20,
    filters?: any,
  ): Promise<{ orders: OrderResponseDto[]; total: number; totalPages: number }> {
    const where: any = {};

    if (filters?.status) {
      where.trang_thai_don = filters.status;
    }

    if (filters?.payment_status) {
      where.trang_thai_thanh_toan = filters.payment_status;
    }

    if (filters?.date_from) {
      where.ngay_dat = { gte: new Date(filters.date_from) };
    }

    if (filters?.date_to) {
      where.ngay_dat = { ...where.ngay_dat, lte: new Date(filters.date_to) };
    }

    const [orders, total] = await Promise.all([
      this.prisma.don_hang.findMany({
        where,
        include: {
          chi_tiet_don_hang: {
            include: {
              bien_the_san_pham: {
                include: {
                  san_pham: true,
                  mau_sac: true,
                  kich_co: true,
                  anh_san_pham: {
                    where: { la_anh_chinh: true },
                    take: 1,
                  },
                },
              },
            },
          },
          phuong_thuc_thanh_toan: true,
          don_vi_van_chuyen: true,
          nguoi_dung: {
            select: {
              id: true,
              ho_ten: true,
              email: true,
              so_dien_thoai: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.don_hang.count({ where }),
    ]);

    return {
      orders: orders.map((order: any) => this.formatOrderResponse(order)),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================
  // CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
  // ============================================================
  async updateOrderStatus(
    orderId: number,
    dto: UpdateOrderStatusDto,
    userId?: number,
  ): Promise<OrderResponseDto> {
    const order = await this.prisma.don_hang.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const validStatuses = [
      'Chờ xác nhận',
      'Đã xác nhận',
      'Đang chuẩn bị',
      'Đang giao hàng',
      'Đã giao hàng',
      'Hoàn thành',
      'Đã hủy',
      'Trả hàng',
    ];

    if (!validStatuses.includes(dto.trang_thai_don)) {
      throw new BadRequestException('Trạng thái đơn hàng không hợp lệ');
    }

    if (order.trang_thai_don === 'Đã hủy' || order.trang_thai_don === 'Hoàn thành') {
      throw new BadRequestException('Không thể thay đổi trạng thái của đơn hàng đã hoàn thành hoặc đã hủy');
    }

    await this.prisma.don_hang.update({
      where: { id: orderId },
      data: {
        trang_thai_don: dto.trang_thai_don,
        updated_at: new Date(),
        ...(dto.trang_thai_don === 'Đã giao hàng' && {
          ngay_giao_thuc_te: new Date(),
          trang_thai_thanh_toan: 'Đã thanh toán',
        }),
        ...(dto.trang_thai_don === 'Đã hủy' && {
          trang_thai_thanh_toan: 'Đã hủy',
        }),
      },
    });

    await this.prisma.lich_su_trang_thai_don.create({
      data: {
        don_hang_id: orderId,
        trang_thai_cu: order.trang_thai_don || undefined,
        trang_thai_moi: dto.trang_thai_don,
        ghi_chu: dto.ghi_chu || '',
        nguoi_thay_doi: userId ? `User ${userId}` : 'System',
        created_at: new Date(),
      },
    });

    // Nếu hủy đơn, hoàn lại tồn kho
    if (dto.trang_thai_don === 'Đã hủy') {
      const orderItems = await this.prisma.chi_tiet_don_hang.findMany({
        where: { don_hang_id: orderId },
      });

      for (const item of orderItems) {
        const variant = await this.prisma.bien_the_san_pham.findUnique({
          where: { id: item.bien_the_san_pham_id },
          include: { ton_kho: true },
        });

        if (variant && variant.ton_kho) {
          const currentTon = variant.ton_kho.so_luong_ton ?? 0;
          const currentChoXuat = variant.ton_kho.so_luong_cho_xuat ?? 0;

          await this.prisma.ton_kho.update({
            where: { bien_the_san_pham_id: variant.id },
            data: {
              so_luong_ton: currentTon + item.so_luong,
              so_luong_cho_xuat: Math.max(0, currentChoXuat - item.so_luong),
              ngay_cap_nhat: new Date(),
            },
          });
        }
      }
    }

    this.logger.log(`Order ${orderId} status updated to ${dto.trang_thai_don}`);

    return this.getOrderDetail(orderId);
  }

  // ============================================================
  // CẬP NHẬT THÔNG TIN ĐƠN HÀNG
  // ============================================================
  async updateOrder(orderId: number, dto: UpdateOrderDto): Promise<OrderResponseDto> {
    const order = await this.prisma.don_hang.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    await this.prisma.don_hang.update({
      where: { id: orderId },
      data: {
        ...dto,
        updated_at: new Date(),
      },
    });

    return this.getOrderDetail(orderId);
  }

  // ============================================================
  // LẤY TRẠNG THÁI ĐƠN HÀNG
  // ============================================================
  async getOrderStatuses(): Promise<string[]> {
    return [
      'Chờ xác nhận',
      'Đã xác nhận',
      'Đang chuẩn bị',
      'Đang giao hàng',
      'Đã giao hàng',
      'Hoàn thành',
      'Đã hủy',
      'Trả hàng',
    ];
  }

  // ============================================================
  // FORMAT RESPONSE
  // ============================================================
  private formatOrderResponse(order: any): OrderResponseDto {
    const items: OrderItemResponseDto[] = (order.chi_tiet_don_hang || []).map((item: any) => {
      const variant = item.bien_the_san_pham;

      let hinhAnh = item.hinh_anh || null;
      if (!hinhAnh && variant?.anh_san_pham && variant.anh_san_pham.length > 0) {
        hinhAnh = variant.anh_san_pham[0]?.duong_dan || null;
      }

      return {
        id: item.id,
        bien_the_san_pham_id: item.bien_the_san_pham_id,
        ten_san_pham: variant?.san_pham?.ten_san_pham || '',
        ten_bien_the: item.ten_bien_the || variant?.variant_name || '',
        ten_mau: variant?.mau_sac?.ten_mau || '',
        ten_kich_co: variant?.kich_co?.ten_kich_co || '',
        so_luong: item.so_luong,
        gia_ban_tai_thoi_diem: item.gia_ban_tai_thoi_diem,
        giam_gia: item.giam_gia || 0,
        thanh_tien: item.thanh_tien,
        hinh_anh: hinhAnh,
      };
    });

    return {
      id: order.id,
      ma_don_hang: order.ma_don_hang,
      nguoi_dung_id: order.nguoi_dung_id,
      tong_tien_hang: order.tong_tien_hang,
      tong_giam_gia: order.tong_giam_gia || 0,
      phi_van_chuyen: order.phi_van_chuyen || 0,
      tong_thanh_toan: order.tong_thanh_toan,
      trang_thai_don: order.trang_thai_don || 'Chờ xác nhận',
      trang_thai_thanh_toan: order.trang_thai_thanh_toan || 'Chưa thanh toán',
      ho_ten_nguoi_nhan: order.ho_ten_nguoi_nhan,
      so_dien_thoai_nguoi_nhan: order.so_dien_thoai_nguoi_nhan,
      dia_chi_giao_hang: order.dia_chi_giao_hang,
      ghi_chu: order.ghi_chu || null,
      ma_van_don: order.ma_van_don || null,
      ngay_dat: order.ngay_dat,
      ngay_giao_du_kien: order.ngay_giao_du_kien || null,
      items,
      phuong_thuc_thanh_toan: order.phuong_thuc_thanh_toan?.ten_phuong_thuc || '',
      don_vi_van_chuyen: order.don_vi_van_chuyen?.ten_don_vi || undefined,
      created_at: order.created_at || new Date(),
      updated_at: order.updated_at || new Date(),
    };
  }
}