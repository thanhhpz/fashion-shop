// src/modules/search/search.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchEngine } from './thuat_toan_search/search-engine';
import { VietnameseProcessor } from './thuat_toan_search/vietnamese-processor';
import { SearchDto } from './dto/search.dto';
import { Suggestion, TrendingKeyword } from './SearchInterface';

@Injectable()
export class SearchService implements OnModuleInit {
  private searchEngine: SearchEngine | null = null;
  private readonly logger = new Logger(SearchService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadProducts();
  }

  async loadProducts() {
    try {
      const products = await this.prisma.san_pham.findMany({
        where: { trang_thai: 'Đang bán', deleted_at: null },
        include: {
          thuong_hieu: true,
          danh_muc: true,
          bien_the_san_pham: {
            include: {
              mau_sac: true,
              kich_co: true,
              anh_san_pham: { where: { la_anh_chinh: true }, take: 1 },
            },
          },
        },
      });

      const productIds = products.map(p => p.id);
      const tonKhos = await this.prisma.ton_kho.findMany({
        where: { bien_the_san_pham: { san_pham_id: { in: productIds } } },
        select: { bien_the_san_pham_id: true, so_luong_ton: true },
      });

      const tonKhoMap = new Map<number, number>();
      tonKhos.forEach(tk => tonKhoMap.set(tk.bien_the_san_pham_id, tk.so_luong_ton || 0));

      const formattedProducts = products.map(product => ({
        id: product.id,
        ten_san_pham: product.ten_san_pham,
        slug: product.slug,
        mo_ta: product.mo_ta || '',
        mo_ta_ngan: product.mo_ta_ngan || '',
        gia_ban: product.bien_the_san_pham[0]?.gia_ban || 0,
        gia_niem_yet: product.bien_the_san_pham[0]?.gia_niem_yet || 0,
        danh_muc_id: product.danh_muc_id,
        danh_muc: product.danh_muc,
        thuong_hieu_id: product.thuong_hieu_id,
        thuong_hieu: product.thuong_hieu,
        luot_xem: product.luot_xem || 0,
        noi_bat: product.noi_bat || false,
        trang_thai: product.trang_thai,
        created_at: product.created_at,
        colors: product.bien_the_san_pham
          .map(bt => bt.mau_sac)
          .filter((c): c is NonNullable<typeof c> => c !== null)
          .filter((c, i, self) => self.findIndex(x => x.id === c.id) === i),
        sizes: product.bien_the_san_pham
          .map(bt => bt.kich_co)
          .filter((s): s is NonNullable<typeof s> => s !== null)
          .filter((s, i, self) => self.findIndex(x => x.id === s.id) === i),
        anh_dai_dien: product.bien_the_san_pham[0]?.anh_san_pham[0]?.duong_dan || null,
        ton_kho: Math.min(...product.bien_the_san_pham.map(bt => tonKhoMap.get(bt.id) || 0)),
        min_price: Math.min(...product.bien_the_san_pham.map(bt => bt.gia_ban || 0)),
        max_price: Math.max(...product.bien_the_san_pham.map(bt => bt.gia_ban || 0)),
        sold: 0,
        rating: 0,
      }));

      this.searchEngine = new SearchEngine(formattedProducts);
      this.logger.log(`✅ Loaded ${formattedProducts.length} products`);
    } catch (error) {
      this.logger.error('❌ Failed to load products:', error);
      throw error;
    }
  }

  async searchProducts(query: SearchDto) {
    const {
      keyword,
      page = 1,
      limit = 12,
      minPrice,
      maxPrice,
      categoryIds,
      brandIds,
      colorIds,
      sizeIds,
      isSale,
      inStock,
      sort = 'default',
    } = query;

    if (!this.searchEngine) await this.loadProducts();

    if (!keyword || keyword.trim().length === 0) {
      return this.getLatestProducts(page, limit, {
        minPrice, maxPrice, categoryIds, brandIds, colorIds, sizeIds, isSale, inStock, sort
      });
    }

    // 🔥 TỰ ĐỘNG XỬ LÝ QUERY
    const processed = VietnameseProcessor.processQuery(keyword);
    
    if (processed.corrected !== keyword) {
      this.logger.debug(`🔍 Auto-correct: "${keyword}" → "${processed.corrected}"`);
    }

    const searchKeyword = processed.expanded || processed.corrected || keyword;
    let results = this.searchEngine!.search(searchKeyword, limit * 3);

    results = this.applyFilters(results, {
      minPrice, maxPrice, categoryIds, brandIds, colorIds, sizeIds, isSale, inStock
    });

    results = this.applySort(results, sort);

    const total = results.length;
    const start = (page - 1) * limit;
    const end = Math.min(start + limit, total);
    const paginated = results.slice(start, end);

    let suggestions: Suggestion[] = [];
    if (total === 0 && keyword) {
      const suggestionLabels = this.searchEngine!.suggest(keyword);
      suggestions = suggestionLabels.map((label, index) => ({
        id: `suggestion-${Date.now()}-${index}`,
        type: 'keyword' as const,
        label,
        icon: 'search',
      }));
    }

    const filters = await this.getFilterCounts(searchKeyword);

    return {
      products: paginated.map((r) => ({
        ...r.product,
        _searchScore: Math.round(r.score),
        _matchType: r.matchType,
        _matchedTokens: r.matchedTokens,
        _matchedFilters: r.matchedFilters || [],
        _originalKeyword: keyword,
        _correctedKeyword: processed.corrected,
      })),
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      keyword: searchKeyword || '',
      originalKeyword: keyword,
      suggestions,
      filters,
    };
  }

  private applyFilters(results: any[], filters: any): any[] {
    let filtered = results;

    if (filters.minPrice !== undefined && filters.minPrice !== null) {
      filtered = filtered.filter(r => (r.product.min_price || 0) >= filters.minPrice);
    }
    if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
      filtered = filtered.filter(r => (r.product.min_price || 0) <= filters.maxPrice);
    }
    if (filters.categoryIds?.length) {
      filtered = filtered.filter(r => filters.categoryIds.includes(r.product.danh_muc_id));
    }
    if (filters.brandIds?.length) {
      filtered = filtered.filter(r => filters.brandIds.includes(r.product.thuong_hieu_id));
    }
    if (filters.colorIds?.length) {
      filtered = filtered.filter(r => {
        const colorIdsInProduct = r.product.colors?.map((c: any) => c.id) || [];
        return filters.colorIds.some(id => colorIdsInProduct.includes(id));
      });
    }
    if (filters.sizeIds?.length) {
      filtered = filtered.filter(r => {
        const sizeIdsInProduct = r.product.sizes?.map((s: any) => s.id) || [];
        return filters.sizeIds.some(id => sizeIdsInProduct.includes(id));
      });
    }
    if (filters.inStock) {
      filtered = filtered.filter(r => (r.product.ton_kho || 0) > 0);
    }
    if (filters.isSale) {
      filtered = filtered.filter(r => {
        const price = r.product.min_price || 0;
        const originalPrice = r.product.gia_niem_yet || 0;
        return originalPrice > price;
      });
    }

    return filtered;
  }

  private applySort(results: any[], sort: string): any[] {
    switch (sort) {
      case 'price_asc': return results.sort((a, b) => (a.product.min_price || 0) - (b.product.min_price || 0));
      case 'price_desc': return results.sort((a, b) => (b.product.min_price || 0) - (a.product.min_price || 0));
      case 'latest': return results.sort((a, b) => new Date(b.product.created_at).getTime() - new Date(a.product.created_at).getTime());
      case 'bestseller': return results.sort((a, b) => (b.product.sold || 0) - (a.product.sold || 0));
      case 'rating': return results.sort((a, b) => (b.product.rating || 0) - (a.product.rating || 0));
      default: return results;
    }
  }

  private async getLatestProducts(page: number, limit: number, filters: any) {
    // ... Code lấy sản phẩm mới nhất (giữ nguyên từ file cũ)
    const where: any = { trang_thai: 'Đang bán', deleted_at: null };
    // ... phần còn lại
  }

  async getSuggestions(keyword: string): Promise<Suggestion[]> {
    if (!keyword || keyword.length < 2) return [];
    if (!this.searchEngine) await this.loadProducts();
    const suggestions = this.searchEngine!.suggest(keyword);
    return suggestions.slice(0, 10).map((label, index) => ({
      id: `suggestion-${Date.now()}-${index}`,
      type: 'keyword' as const,
      label,
      icon: 'search',
    }));
  }

  async getTrendingKeywords(limit: number = 10): Promise<TrendingKeyword[]> {
    return [
      { keyword: 'áo thun', count: 1234 },
      { keyword: 'giày thể thao', count: 987 },
      { keyword: 'váy', count: 756 },
      { keyword: 'quần jeans', count: 654 },
      { keyword: 'áo sơ mi', count: 543 },
    ].slice(0, limit);
  }

  async getFilterCounts(keyword?: string): Promise<any> {
    const whereCondition = keyword ? {
      ten_san_pham: { contains: keyword, mode: 'insensitive' as const },
      trang_thai: 'Đang bán',
      deleted_at: null,
    } : { trang_thai: 'Đang bán', deleted_at: null };

    const [categories, brands, colors, sizes, priceAggregate] = await Promise.all([
      this.prisma.danh_muc.findMany({
        where: { trang_thai: true },
        select: { id: true, ten_danh_muc: true, slug: true, _count: { select: { san_pham: { where: whereCondition } } } },
      }),
      this.prisma.thuong_hieu.findMany({
        where: { trang_thai: true },
        select: { id: true, ten_thuong_hieu: true, _count: { select: { san_pham: { where: whereCondition } } } },
      }),
      this.prisma.mau_sac.findMany({
        where: { trang_thai: true },
        select: { id: true, ten_mau: true, ma_hex: true, _count: { select: { bien_the_san_pham: { where: { san_pham: whereCondition } } } } },
      }),
      this.prisma.kich_co.findMany({
        where: { trang_thai: true },
        select: { id: true, ten_kich_co: true, _count: { select: { bien_the_san_pham: { where: { san_pham: whereCondition } } } } },
      }),
      this.prisma.bien_the_san_pham.aggregate({
        where: { san_pham: whereCondition },
        _min: { gia_ban: true },
        _max: { gia_ban: true },
      }),
    ]);

    return {
      categories: categories.filter(c => c._count.san_pham > 0),
      brands: brands.filter(b => b._count.san_pham > 0),
      colors: colors.filter(c => c._count.bien_the_san_pham > 0),
      sizes: sizes.filter(s => s._count.bien_the_san_pham > 0),
      priceRange: { min: priceAggregate._min.gia_ban || 0, max: priceAggregate._max.gia_ban || 0 },
    };
  }

  async getRelatedProducts(productId: number, limit: number = 6) {
    if (!this.searchEngine) await this.loadProducts();
    return this.searchEngine!.findRelated(productId, limit);
  }

  async reloadProducts() {
    await this.loadProducts();
    return { success: true, message: 'Đã reload dữ liệu tìm kiếm' };
  }
}