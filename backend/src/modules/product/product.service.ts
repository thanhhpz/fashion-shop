// backend/src/modules/products/product.service.ts
import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductVariantDto, ProductImageDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // LẤY SẢN PHẨM THEO DANH MỤC (CÓ FILTER, SORT, PAGINATION)
  // ============================================================
  async getProductsByCategory(params: {
    categorySlug: string;
    danhMucCon?: string;
    sort?: string;
    page?: number;
    limit?: number;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const {
      categorySlug,
      danhMucCon,
      sort = 'default',
      page = 1,
      limit = 12,
      minPrice,
      maxPrice,
    } = params;

    const pageSize = limit;
    const skip = (page - 1) * pageSize;

    const category = await this.prisma.danh_muc.findFirst({
      where: {
        slug: categorySlug,
        trang_thai: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục: ${categorySlug}`);
    }

    let categoryIds: number[] = [];

    if (danhMucCon) {
      const subCategory = await this.prisma.danh_muc.findFirst({
        where: {
          slug: danhMucCon,
          danh_muc_cha_id: category.id,
          trang_thai: true,
        },
      });

      if (subCategory) {
        categoryIds = [subCategory.id];
      } else {
        const subCategories = await this.prisma.danh_muc.findMany({
          where: {
            danh_muc_cha_id: category.id,
            trang_thai: true,
          },
        });
        categoryIds = subCategories.map((sub: any) => sub.id);
      }
    } else {
      const subCategories = await this.prisma.danh_muc.findMany({
        where: {
          danh_muc_cha_id: category.id,
          trang_thai: true,
        },
      });
      categoryIds = [category.id, ...subCategories.map((sub: any) => sub.id)];
    }

    const where: any = {
      danh_muc_id: { in: categoryIds },
      deleted_at: null,
      trang_thai: 'Đang bán',
    };

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.bien_the_san_pham = {
        some: {},
      };
      if (minPrice !== undefined) {
        where.bien_the_san_pham.some.gia_ban = { gte: minPrice };
      }
      if (maxPrice !== undefined) {
        where.bien_the_san_pham.some.gia_ban = { lte: maxPrice };
      }
    }

    let orderBy: any = {};
    switch (sort) {
      case 'price_asc':
        orderBy = { bien_the_san_pham: { _avg: { gia_ban: 'asc' } } };
        break;
      case 'price_desc':
        orderBy = { bien_the_san_pham: { _avg: { gia_ban: 'desc' } } };
        break;
      case 'latest':
        orderBy = { created_at: 'desc' };
        break;
      case 'popular':
        orderBy = { luot_xem: 'desc' };
        break;
      default:
        orderBy = { id: 'desc' };
        break;
    }

    const products = await this.prisma.san_pham.findMany({
      where,
      include: {
        thuong_hieu: true,
        danh_muc: true,
        bien_the_san_pham: {
          include: {
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
      orderBy,
      skip,
      take: pageSize,
    });

    const formattedProducts = products.map((product) => {
      const variants = product.bien_the_san_pham;
      const cheapestVariant = variants.reduce((min: any, current: any) =>
        current.gia_ban < min.gia_ban ? current : min
      , variants[0]);

      const mainImage = cheapestVariant?.anh_san_pham?.[0]?.duong_dan || null;

      const colors = variants
        .map((v: any) => v.mau_sac)
        .filter((c: any) => c !== null)
        .filter((c: any, i: number, self: any[]) =>
          self.findIndex((x: any) => x.id === c.id) === i
        );

      return {
        id: product.id,
        ten_san_pham: product.ten_san_pham,
        slug: product.slug,
        gia_ban: cheapestVariant?.gia_ban || 0,
        gia_goc: cheapestVariant?.gia_niem_yet || 0,
        mo_ta: product.mo_ta_ngan || product.mo_ta,
        anh_dai_dien: mainImage,
        thuong_hieu: product.thuong_hieu,
        danh_muc: product.danh_muc,
        colors: colors,
        trang_thai: product.trang_thai,
        noi_bat: product.noi_bat,
        created_at: product.created_at,
      };
    });

    const totalProducts = await this.prisma.san_pham.count({ where });

    return {
      products: formattedProducts,
      totalProducts,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / pageSize),
      pageSize,
    };
  }

  // ============================================================
  // LẤY SẢN PHẨM THEO SLUG
  // ============================================================
  async getProductBySlug(slug: string) {
    const product = await this.prisma.san_pham.findFirst({
      where: {
        slug,
        deleted_at: null,
      },
      include: {
        thuong_hieu: true,
        danh_muc: {
          include: {
            danh_muc: true,
          },
        },
        bien_the_san_pham: {
          include: {
            kich_co: true,
            mau_sac: true,
            ton_kho: true,
            anh_san_pham: {
              orderBy: { thu_tu: 'asc' },
            },
          },
        },
        anh_san_pham: {
          where: { san_pham_id: { not: null } },
          orderBy: { thu_tu: 'asc' },
        },
        san_pham_tags: {
          include: {
            tags: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm: ${slug}`);
    }

    await this.prisma.san_pham.update({
      where: { id: product.id },
      data: { luot_xem: { increment: 1 } },
    });

    return this.formatProductDetail(product);
  }

  // ============================================================
  // FORMAT CHI TIẾT SẢN PHẨM
  // ============================================================
  private formatProductDetail(product: any) {
    const variants = product.bien_the_san_pham;
    const cheapestVariant = variants.reduce((min: any, current: any) =>
      current.gia_ban < min.gia_ban ? current : min
    , variants[0]);

    const mainImages = product.anh_san_pham || [];

    return {
      id: product.id,
      ten_san_pham: product.ten_san_pham,
      slug: product.slug,
      mo_ta: product.mo_ta,
      mo_ta_ngan: product.mo_ta_ngan,
      gia_goc: cheapestVariant?.gia_niem_yet || 0,
      gia_ban: cheapestVariant?.gia_ban || 0,
      trang_thai: product.trang_thai,
      luot_xem: product.luot_xem,
      noi_bat: product.noi_bat,
      trong_luong: product.trong_luong,
      thuong_hieu: product.thuong_hieu,
      danh_muc: {
        id: product.danh_muc.id,
        ten_danh_muc: product.danh_muc.ten_danh_muc,
        slug: product.danh_muc.slug,
        danh_muc_cha: product.danh_muc.danh_muc,
      },
      images: mainImages.map((img: any) => ({
        id: img.id,
        duong_dan: img.duong_dan,
        la_anh_chinh: img.la_anh_chinh,
        thu_tu: img.thu_tu,
      })),
      variants: variants.map((variant: any) => ({
        id: variant.id,
        sku: variant.sku,
        variant_name: variant.variant_name,
        gia_ban: variant.gia_ban,
        gia_nhap: variant.gia_nhap,
        gia_niem_yet: variant.gia_niem_yet,
        trang_thai: variant.trang_thai,
        ton_kho: variant.ton_kho?.so_luong_ton || 0,
        kich_co: variant.kich_co,
        mau_sac: variant.mau_sac,
        images: variant.anh_san_pham.map((img: any) => ({
          id: img.id,
          duong_dan: img.duong_dan,
          la_anh_chinh: img.la_anh_chinh,
          thu_tu: img.thu_tu,
        })),
      })),
      tags: product.san_pham_tags.map((st: any) => ({
        id: st.tags.id,
        ten_tag: st.tags.ten_tag,
      })),
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  }

  // ============================================================
  // LẤY SẢN PHẨM NỔI BẬT
  // ============================================================
  async getFeaturedProducts(limit: number = 8) {
    const products = await this.prisma.san_pham.findMany({
      where: {
        noi_bat: true,
        deleted_at: null,
        trang_thai: 'Đang bán',
      },
      include: {
        thuong_hieu: true,
        bien_the_san_pham: {
          include: {
            anh_san_pham: {
              where: { la_anh_chinh: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { luot_xem: 'desc' },
      take: limit,
    });

    return products.map((product) => {
      const variants = product.bien_the_san_pham;
      const cheapestVariant = variants.reduce((min: any, current: any) =>
        current.gia_ban < min.gia_ban ? current : min
      , variants[0]);

      return {
        id: product.id,
        ten_san_pham: product.ten_san_pham,
        slug: product.slug,
        gia_ban: cheapestVariant?.gia_ban || 0,
        gia_goc: cheapestVariant?.gia_niem_yet || 0,
        anh_dai_dien: cheapestVariant?.anh_san_pham?.[0]?.duong_dan || null,
        thuong_hieu: product.thuong_hieu,
      };
    });
  }

  // ============================================================
  // LẤY SẢN PHẨM THEO ID
  // ============================================================
  async getProductById(id: number) {
    const product = await this.prisma.san_pham.findUnique({
      where: { id, deleted_at: null },
      include: {
        thuong_hieu: true,
        danh_muc: true,
        bien_the_san_pham: {
          include: {
            kich_co: true,
            mau_sac: true,
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

  // ============================================================
  // 🆕 TẠO SẢN PHẨM MỚI (ADMIN)
  // ============================================================
  async createProduct(createProductDto: CreateProductDto) {
    const {
      ten_san_pham,
      mo_ta,
      mo_ta_ngan,
      danh_muc_id,
      thuong_hieu_id,
      slug,
      trong_luong,
      trang_thai,
      noi_bat,
      variants = [],
      images = [],
      tag_ids = []
    } = createProductDto;

    // Kiểm tra slug đã tồn tại chưa
    if (slug) {
      const existingProduct = await this.prisma.san_pham.findFirst({
        where: { slug, deleted_at: null },
      });
      if (existingProduct) {
        throw new BadRequestException(`Slug "${slug}" đã tồn tại`);
      }
    }

    // Tạo sản phẩm
    const product = await this.prisma.san_pham.create({
      data: {
        ten_san_pham,
        mo_ta,
        mo_ta_ngan,
        danh_muc_id,
        thuong_hieu_id: thuong_hieu_id || null,
        slug: slug || this.generateSlug(ten_san_pham),
        trong_luong: trong_luong || null,
        trang_thai: trang_thai || 'Đang bán',
        noi_bat: noi_bat || false,
        luot_xem: 0,
      },
    });

    // Tạo biến thể
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        const createdVariant = await this.prisma.bien_the_san_pham.create({
          data: {
            san_pham_id: product.id,
            kich_co_id: variant.kich_co_id,
            mau_id: variant.mau_id,
            variant_name: variant.variant_name || null,
            gia_ban: variant.gia_ban,
            gia_nhap: variant.gia_nhap,
            gia_niem_yet: variant.gia_niem_yet,
            sku: variant.sku || this.generateSku(product.id, variant.kich_co_id, variant.mau_id),
            trang_thai: variant.trang_thai || 'Còn hàng',
          },
        });

        // Tạo tồn kho
        await this.prisma.ton_kho.create({
          data: {
            bien_the_san_pham_id: createdVariant.id,
            so_luong_ton: variant.so_luong_ton || 0,
            so_luong_cho_xuat: 0,
            so_luong_toi_thieu: 10,
            ngay_cap_nhat: new Date(),
          },
        });

        // Thêm ảnh cho biến thể (nếu có)
        const variantImages = images.filter(img => 
          // img.bien_the_san_pham_id === variant.id || 
          img.variant_sku === variant.sku
        );
        for (const img of variantImages) {
          await this.prisma.anh_san_pham.create({
            data: {
              bien_the_san_pham_id: createdVariant.id,
              duong_dan: img.duong_dan,
              la_anh_chinh: img.la_anh_chinh || false,
              thu_tu: img.thu_tu || 0,
            },
          });
        }
      }
    }

    // Thêm tags
    if (tag_ids && tag_ids.length > 0) {
      for (const tagId of tag_ids) {
        await this.prisma.san_pham_tags.create({
          data: {
            san_pham_id: product.id,
            tag_id: tagId,
          },
        });
      }
    }

    this.logger.log(`✅ Created product: ${product.ten_san_pham} (ID: ${product.id})`);
    return this.getProductById(product.id);
  }

  // ============================================================
  // 🆕 CẬP NHẬT SẢN PHẨM (ADMIN)
  // ============================================================
  async updateProduct(id: number, updateProductDto: UpdateProductDto) {
    // Kiểm tra sản phẩm tồn tại
    const existingProduct = await this.prisma.san_pham.findUnique({
      where: { id, deleted_at: null },
    });
    if (!existingProduct) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
    }

    const {
      ten_san_pham,
      mo_ta,
      mo_ta_ngan,
      danh_muc_id,
      thuong_hieu_id,
      slug,
      trong_luong,
      trang_thai,
      noi_bat,
      variants,
      images,
      tag_ids
    } = updateProductDto;

    // Kiểm tra slug mới không bị trùng
    if (slug && slug !== existingProduct.slug) {
      const conflict = await this.prisma.san_pham.findFirst({
        where: { slug, deleted_at: null, id: { not: id } },
      });
      if (conflict) {
        throw new BadRequestException(`Slug "${slug}" đã tồn tại`);
      }
    }

    // Cập nhật thông tin cơ bản
    await this.prisma.san_pham.update({
      where: { id },
      data: {
        ten_san_pham,
        mo_ta,
        mo_ta_ngan,
        danh_muc_id,
        thuong_hieu_id: thuong_hieu_id || null,
        slug,
        trong_luong: trong_luong || null,
        trang_thai: trang_thai || 'Đang bán',
        noi_bat: noi_bat || false,
        updated_at: new Date(),
      },
    });

    // Nếu có cập nhật biến thể (xóa cũ và tạo mới)
    if (variants && variants.length > 0) {
      // Xóa các biến thể cũ (cascade xóa ton_kho và anh_san_pham)
      await this.prisma.bien_the_san_pham.deleteMany({
        where: { san_pham_id: id },
      });

      // Tạo lại biến thể mới
      for (const variant of variants) {
        const createdVariant = await this.prisma.bien_the_san_pham.create({
          data: {
            san_pham_id: id,
            kich_co_id: variant.kich_co_id,
            mau_id: variant.mau_id,
            variant_name: variant.variant_name || null,
            gia_ban: variant.gia_ban,
            gia_nhap: variant.gia_nhap,
            gia_niem_yet: variant.gia_niem_yet,
            sku: variant.sku || this.generateSku(id, variant.kich_co_id, variant.mau_id),
            trang_thai: variant.trang_thai || 'Còn hàng',
          },
        });

        await this.prisma.ton_kho.create({
          data: {
            bien_the_san_pham_id: createdVariant.id,
            so_luong_ton: variant.so_luong_ton || 0,
            so_luong_cho_xuat: 0,
            so_luong_toi_thieu: 10,
            ngay_cap_nhat: new Date(),
          },
        });

        // Thêm ảnh cho biến thể
        const variantImages = (images || []).filter((img: any) => 
          // img.bien_the_san_pham_id === variant.id || 
          img.variant_sku === variant.sku
        );
        for (const img of variantImages) {
          await this.prisma.anh_san_pham.create({
            data: {
              bien_the_san_pham_id: createdVariant.id,
              duong_dan: img.duong_dan,
              la_anh_chinh: img.la_anh_chinh || false,
              thu_tu: img.thu_tu || 0,
            },
          });
        }
      }
    }

    // Nếu có cập nhật tags
    if (tag_ids) {
      await this.prisma.san_pham_tags.deleteMany({
        where: { san_pham_id: id },
      });
      for (const tagId of tag_ids) {
        await this.prisma.san_pham_tags.create({
          data: {
            san_pham_id: id,
            tag_id: tagId,
          },
        });
      }
    }

    this.logger.log(`✅ Updated product: ${ten_san_pham || existingProduct.ten_san_pham} (ID: ${id})`);
    return this.getProductById(id);
  }

  // ============================================================
  // 🆕 XÓA SẢN PHẨM (ADMIN) - Soft delete
  // ============================================================
  async deleteProduct(id: number) {
    const existingProduct = await this.prisma.san_pham.findUnique({
      where: { id, deleted_at: null },
    });
    if (!existingProduct) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
    }

    // Soft delete - chỉ đánh dấu deleted_at và đổi trạng thái
    const deleted = await this.prisma.san_pham.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        trang_thai: 'Ngừng bán',
      },
    });

    this.logger.log(`🗑️ Soft deleted product: ${deleted.ten_san_pham} (ID: ${id})`);
    return {
      id: deleted.id,
      ten_san_pham: deleted.ten_san_pham,
      message: `Đã xóa sản phẩm "${deleted.ten_san_pham}"`,
    };
  }

  // ============================================================
  // 🆕 HELPER: Tạo slug từ tên sản phẩm
  // ============================================================
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ============================================================
  // 🆕 HELPER: Tạo SKU
  // ============================================================
  private generateSku(productId: number, kichCoId: number, mauId: number): string {
    const timestamp = Date.now().toString().slice(-6);
    return `SP-${productId}-${kichCoId}-${mauId}-${timestamp}`;
  }
}