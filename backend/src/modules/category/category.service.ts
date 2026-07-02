import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CategoryResponseDto } from "./dto/category-response.dto";

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async getCategoryBySlug(slug: string): Promise<any> {
    // Tìm danh mục theo slug (KHÔNG PHÂN BIỆT CẤP 1 HAY CẤP 2)
    const category = await this.prisma.danh_muc.findFirst({
      where: {
        slug: slug,
        trang_thai: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục: ${slug}`);
    }

    // Nếu là danh mục cấp 1
    if (category.danh_muc_cha_id === null) {
      const subCategories = await this.prisma.danh_muc.findMany({
        where: {
          danh_muc_cha_id: category.id,
          trang_thai: true,
        },
        orderBy: { id: 'asc' },
      });

      return {
        id: category.id,
        ten_danh_muc: category.ten_danh_muc,
        slug: category.slug,
        mo_ta: category.mo_ta,
        subCategories: subCategories.map(sub => ({
          id: sub.id,
          ten_danh_muc: sub.ten_danh_muc,
          slug: sub.slug,
        })),
        parent: null,
      };
    }

    // Nếu là danh mục cấp 2 (có cha)
    const parent = await this.prisma.danh_muc.findFirst({
      where: {
        id: category.danh_muc_cha_id,
        trang_thai: true,
      },
    });

    // Lấy danh sách subCategories từ danh mục cha
    const subCategories = await this.prisma.danh_muc.findMany({
      where: {
        danh_muc_cha_id: parent?.id,
        trang_thai: true,
      },
      orderBy: { id: 'asc' },
    });

    return {
      id: category.id,
      ten_danh_muc: category.ten_danh_muc,
      slug: category.slug,
      mo_ta: category.mo_ta,
      subCategories: subCategories.map(sub => ({
        id: sub.id,
        ten_danh_muc: sub.ten_danh_muc,
        slug: sub.slug,
      })),
      parent: parent ? {
        id: parent.id,
        ten_danh_muc: parent.ten_danh_muc,
        slug: parent.slug,
      } : null,
    };
  }

  async getCategoryById(id: number): Promise<any> {
    const category = await this.prisma.danh_muc.findFirst({
      where: {
        id: id,
        trang_thai: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${id}`);
    }

    // Nếu là danh mục cấp 1
    if (category.danh_muc_cha_id === null) {
      const subCategories = await this.prisma.danh_muc.findMany({
        where: {
          danh_muc_cha_id: category.id,
          trang_thai: true,
        },
        orderBy: { id: 'asc' },
      });

      return {
        id: category.id,
        ten_danh_muc: category.ten_danh_muc,
        slug: category.slug,
        mo_ta: category.mo_ta,
        subCategories: subCategories.map(sub => ({
          id: sub.id,
          ten_danh_muc: sub.ten_danh_muc,
          slug: sub.slug,
        })),
        parent: null,
      };
    }

    // Nếu là danh mục cấp 2
    const parent = await this.prisma.danh_muc.findFirst({
      where: {
        id: category.danh_muc_cha_id,
        trang_thai: true,
      },
    });

    const subCategories = await this.prisma.danh_muc.findMany({
      where: {
        danh_muc_cha_id: parent?.id,
        trang_thai: true,
      },
      orderBy: { id: 'asc' },
    });

    return {
      id: category.id,
      ten_danh_muc: category.ten_danh_muc,
      slug: category.slug,
      mo_ta: category.mo_ta,
      subCategories: subCategories.map(sub => ({
        id: sub.id,
        ten_danh_muc: sub.ten_danh_muc,
        slug: sub.slug,
      })),
      parent: parent ? {
        id: parent.id,
        ten_danh_muc: parent.ten_danh_muc,
        slug: parent.slug,
      } : null,
    };
  }
}