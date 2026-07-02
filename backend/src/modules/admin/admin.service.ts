// backend/src/modules/admin/admin.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // DASHBOARD
  // ============================================================
  async getDashboardStats() {
    // 1. Tổng doanh thu
    const revenue = await this.prisma.don_hang.aggregate({
      _sum: { tong_thanh_toan: true },
      where: { trang_thai_don: 'Đã giao hàng' },
    });

    // 2. Doanh thu hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayRevenue = await this.prisma.don_hang.aggregate({
      _sum: { tong_thanh_toan: true },
      where: {
        trang_thai_don: 'Đã giao hàng',
        ngay_dat: { gte: today, lt: tomorrow },
      },
    });

    // 3. Doanh thu hôm qua
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayRevenue = await this.prisma.don_hang.aggregate({
      _sum: { tong_thanh_toan: true },
      where: {
        trang_thai_don: 'Đã giao hàng',
        ngay_dat: { gte: yesterday, lt: today },
      },
    });

    // 4. Tổng đơn hàng
    const totalOrders = await this.prisma.don_hang.count();

    // 5. Đơn hàng hôm nay
    const todayOrders = await this.prisma.don_hang.count({
      where: { ngay_dat: { gte: today, lt: tomorrow } },
    });

    // 6. Đơn hàng chờ xác nhận
    const pendingOrders = await this.prisma.don_hang.count({
      where: { trang_thai_don: 'Chờ xác nhận' },
    });

    // 7. Tổng người dùng
    const totalUsers = await this.prisma.nguoi_dung.count({
      where: { deleted_at: null },
    });

    // 8. Người dùng mới hôm nay
    const todayUsers = await this.prisma.nguoi_dung.count({
      where: {
        created_at: { gte: today, lt: tomorrow },
        deleted_at: null,
      },
    });

    // 9. Tổng sản phẩm
    const totalProducts = await this.prisma.san_pham.count({
      where: { deleted_at: null },
    });

    // 10. Sản phẩm sắp hết hàng (< 10)
    const lowStockProducts = await this.prisma.bien_the_san_pham.findMany({
      where: {
        ton_kho: {
          so_luong_ton: { lt: 10 },
        },
        san_pham: {
          deleted_at: null,
        },
      },
      include: {
        san_pham: {
          select: { ten_san_pham: true, slug: true },
        },
        kich_co: true,
        mau_sac: true,
        ton_kho: true,
      },
      take: 10,
    });

    // 11. Đơn hàng gần đây
    const recentOrders = await this.prisma.don_hang.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      include: {
        nguoi_dung: {
          select: { ho_ten: true, email: true },
        },
      },
    });

    // 12. Sản phẩm bán chạy
    const bestSellers = await this.prisma.chi_tiet_don_hang.groupBy({
      by: ['bien_the_san_pham_id'],
      _sum: { so_luong: true },
      orderBy: { _sum: { so_luong: 'desc' } },
      take: 5,
    });

    const bestSellerIds = bestSellers.map((item) => item.bien_the_san_pham_id);
    const bestSellerProducts = await this.prisma.bien_the_san_pham.findMany({
      where: { id: { in: bestSellerIds } },
      include: {
        san_pham: {
          select: { ten_san_pham: true, slug: true },
        },
      },
    });

    const bestSellerData = bestSellers.map((item) => {
      const product = bestSellerProducts.find((p) => p.id === item.bien_the_san_pham_id);
      return {
        ten_san_pham: product?.san_pham?.ten_san_pham || 'Không xác định',
        so_luong_ban: item._sum.so_luong || 0,
      };
    });

    // 13. Thống kê doanh thu theo tháng
    const monthlyRevenue = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', ngay_dat) as month,
        SUM(tong_thanh_toan) as revenue
      FROM don_hang
      WHERE trang_thai_don = 'Đã giao hàng'
      AND ngay_dat >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
      GROUP BY DATE_TRUNC('month', ngay_dat)
      ORDER BY month ASC
    `;

    const revenueData = (monthlyRevenue as any[]).map((item) => ({
      month: new Date(item.month).toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }),
      revenue: Number(item.revenue) || 0,
    }));

    // 14. Thống kê đơn hàng theo trạng thái
    const orderStatusCounts = await this.prisma.don_hang.groupBy({
      by: ['trang_thai_don'],
      _count: { id: true },
    });

    const orderStatusData = orderStatusCounts.map((item) => ({
      status: item.trang_thai_don || 'Không xác định',
      count: item._count.id,
    }));

    return {
      // KPI
      totalRevenue: revenue._sum.tong_thanh_toan || 0,
      todayRevenue: todayRevenue._sum.tong_thanh_toan || 0,
      yesterdayRevenue: yesterdayRevenue._sum.tong_thanh_toan || 0,
      totalOrders,
      todayOrders,
      pendingOrders,
      totalUsers,
      todayUsers,
      totalProducts,

      // Chi tiết
      lowStockProducts,
      recentOrders,
      bestSellerData,
      revenueData,
      orderStatusData,
    };
  }

  // ============================================================
  // DANH MỤC
  // ============================================================
  async getAllCategories() {
    return this.prisma.danh_muc.findMany({
      where: { trang_thai: true },
      orderBy: { id: 'asc' },
    });
  }

  async getCategoryById(id: number) {
    const category = await this.prisma.danh_muc.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${id}`);
    }

    return category;
  }

  async createCategory(data: { ten_danh_muc: string; mo_ta?: string; slug: string; danh_muc_cha_id?: number }) {
    return this.prisma.danh_muc.create({
      data: {
        ten_danh_muc: data.ten_danh_muc,
        mo_ta: data.mo_ta,
        slug: data.slug,
        danh_muc_cha_id: data.danh_muc_cha_id || null,
        trang_thai: true,
      },
    });
  }

  async updateCategory(id: number, data: { ten_danh_muc?: string; mo_ta?: string; slug?: string; trang_thai?: boolean }) {
    const category = await this.prisma.danh_muc.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${id}`);
    }

    return this.prisma.danh_muc.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: number) {
    const category = await this.prisma.danh_muc.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${id}`);
    }

    return this.prisma.danh_muc.update({
      where: { id },
      data: { trang_thai: false },
    });
  }

  // ============================================================
  // THƯƠNG HIỆU
  // ============================================================
  async getAllBrands() {
    return this.prisma.thuong_hieu.findMany({
      where: { trang_thai: true },
      orderBy: { id: 'asc' },
    });
  }

  async getBrandById(id: number) {
    const brand = await this.prisma.thuong_hieu.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Không tìm thấy thương hiệu với ID: ${id}`);
    }

    return brand;
  }

  async createBrand(data: { ten_thuong_hieu: string; logo?: string; mo_ta?: string }) {
    return this.prisma.thuong_hieu.create({
      data: {
        ten_thuong_hieu: data.ten_thuong_hieu,
        logo: data.logo,
        mo_ta: data.mo_ta,
        trang_thai: true,
      },
    });
  }

  async updateBrand(id: number, data: { ten_thuong_hieu?: string; logo?: string; mo_ta?: string; trang_thai?: boolean }) {
    const brand = await this.prisma.thuong_hieu.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Không tìm thấy thương hiệu với ID: ${id}`);
    }

    return this.prisma.thuong_hieu.update({
      where: { id },
      data,
    });
  }

  async deleteBrand(id: number) {
    const brand = await this.prisma.thuong_hieu.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Không tìm thấy thương hiệu với ID: ${id}`);
    }

    return this.prisma.thuong_hieu.update({
      where: { id },
      data: { trang_thai: false },
    });
  }

  // ============================================================
  // MÀU SẮC
  // ============================================================
  async getAllColors() {
    return this.prisma.mau_sac.findMany({
      where: { trang_thai: true },
      orderBy: { id: 'asc' },
    });
  }

  async getColorById(id: number) {
    const color = await this.prisma.mau_sac.findUnique({
      where: { id },
    });

    if (!color) {
      throw new NotFoundException(`Không tìm thấy màu sắc với ID: ${id}`);
    }

    return color;
  }

  async createColor(data: { ten_mau: string; ma_hex: string; mo_ta?: string }) {
    return this.prisma.mau_sac.create({
      data: {
        ten_mau: data.ten_mau,
        ma_hex: data.ma_hex,
        mo_ta: data.mo_ta,
        trang_thai: true,
      },
    });
  }

  async updateColor(id: number, data: { ten_mau?: string; ma_hex?: string; mo_ta?: string; trang_thai?: boolean }) {
    const color = await this.prisma.mau_sac.findUnique({
      where: { id },
    });

    if (!color) {
      throw new NotFoundException(`Không tìm thấy màu sắc với ID: ${id}`);
    }

    return this.prisma.mau_sac.update({
      where: { id },
      data,
    });
  }

  async deleteColor(id: number) {
    const color = await this.prisma.mau_sac.findUnique({
      where: { id },
    });

    if (!color) {
      throw new NotFoundException(`Không tìm thấy màu sắc với ID: ${id}`);
    }

    return this.prisma.mau_sac.update({
      where: { id },
      data: { trang_thai: false },
    });
  }

  // ============================================================
  // KÍCH CỠ
  // ============================================================
  async getAllSizes() {
    return this.prisma.kich_co.findMany({
      where: { trang_thai: true },
      orderBy: { id: 'asc' },
    });
  }

  async getSizeById(id: number) {
    const size = await this.prisma.kich_co.findUnique({
      where: { id },
    });

    if (!size) {
      throw new NotFoundException(`Không tìm thấy kích cỡ với ID: ${id}`);
    }

    return size;
  }

  async createSize(data: { ten_kich_co: string; mo_ta?: string }) {
    return this.prisma.kich_co.create({
      data: {
        ten_kich_co: data.ten_kich_co,
        mo_ta: data.mo_ta,
        trang_thai: true,
      },
    });
  }

  async updateSize(id: number, data: { ten_kich_co?: string; mo_ta?: string; trang_thai?: boolean }) {
    const size = await this.prisma.kich_co.findUnique({
      where: { id },
    });

    if (!size) {
      throw new NotFoundException(`Không tìm thấy kích cỡ với ID: ${id}`);
    }

    return this.prisma.kich_co.update({
      where: { id },
      data,
    });
  }

  async deleteSize(id: number) {
    const size = await this.prisma.kich_co.findUnique({
      where: { id },
    });

    if (!size) {
      throw new NotFoundException(`Không tìm thấy kích cỡ với ID: ${id}`);
    }

    return this.prisma.kich_co.update({
      where: { id },
      data: { trang_thai: false },
    });
  }

  // ============================================================
  // TAGS
  // ============================================================
  async getAllTags() {
    return this.prisma.tags.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async getTagById(id: number) {
    const tag = await this.prisma.tags.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException(`Không tìm thấy tag với ID: ${id}`);
    }

    return tag;
  }

  async createTag(data: { ten_tag: string; mo_ta?: string }) {
    return this.prisma.tags.create({
      data: {
        ten_tag: data.ten_tag,
        mo_ta: data.mo_ta,
      },
    });
  }

  async updateTag(id: number, data: { ten_tag?: string; mo_ta?: string }) {
    const tag = await this.prisma.tags.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException(`Không tìm thấy tag với ID: ${id}`);
    }

    return this.prisma.tags.update({
      where: { id },
      data,
    });
  }

  async deleteTag(id: number) {
    const tag = await this.prisma.tags.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException(`Không tìm thấy tag với ID: ${id}`);
    }

    return this.prisma.tags.delete({
      where: { id },
    });
  }

  // ============================================================
  // SẢN PHẨM
  // ============================================================
  async getProducts(params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: number;
    brandId?: number;
    status?: string;
  }) {
    const { page = 1, limit = 10, search, categoryId, brandId, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      deleted_at: null,
    };

    if (search) {
      where.ten_san_pham = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (categoryId) {
      where.danh_muc_id = categoryId;
    }

    if (brandId) {
      where.thuong_hieu_id = brandId;
    }

    if (status) {
      where.trang_thai = status;
    }

    const [products, total] = await Promise.all([
      this.prisma.san_pham.findMany({
        where,
        include: {
          thuong_hieu: true,
          danh_muc: true,
          bien_the_san_pham: {
            include: {
              mau_sac: true,
              kich_co: true,
              ton_kho: true,
            },
          },
          anh_san_pham: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.san_pham.count({ where }),
    ]);

    return {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  }

  async getProductById(id: number) {
    const product = await this.prisma.san_pham.findUnique({
      where: { id, deleted_at: null },
      include: {
        thuong_hieu: true,
        danh_muc: true,
        bien_the_san_pham: {
          include: {
            mau_sac: true,
            kich_co: true,
            ton_kho: true,
            anh_san_pham: true,
          },
        },
        anh_san_pham: true,
        san_pham_tags: {
          include: {
            tags: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
    }

    return product;
  }

  async updateProduct(id: number, data: any) {
    // Kiểm tra sản phẩm tồn tại
    const product = await this.prisma.san_pham.findUnique({
      where: { id, deleted_at: null },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
    }

    // Cập nhật sản phẩm
    return this.prisma.san_pham.update({
      where: { id },
      data: {
        ten_san_pham: data.ten_san_pham,
        mo_ta: data.mo_ta,
        mo_ta_ngan: data.mo_ta_ngan,
        danh_muc_id: data.danh_muc_id,
        thuong_hieu_id: data.thuong_hieu_id,
        slug: data.slug,
        trong_luong: data.trong_luong,
        trang_thai: data.trang_thai,
        noi_bat: data.noi_bat,
        updated_at: new Date(),
      },
    });
  }

  async deleteProduct(id: number) {
    const product = await this.prisma.san_pham.findUnique({
      where: { id, deleted_at: null },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
    }

    return this.prisma.san_pham.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        trang_thai: 'Ngừng bán',
      },
    });
  }
}