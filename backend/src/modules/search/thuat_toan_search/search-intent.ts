// src/modules/search/thuat_toan_search/search-intent.ts

import { VietnameseProcessor } from './vietnamese-processor';

export interface SearchIntent {
  categories: string[];
  brands: string[];
  colors: string[];
  sizes: string[];
  materials: string[];
  styles: string[];
  occasions: string[];
  seasons: string[];
  patterns: string[];
  fits: string[];
  collars: string[];
  sleeves: string[];
  gender: string | null;
  priceRange: { min: number | null; max: number | null };
  isSale: boolean;
  inStock: boolean;
  trends: string[];
  mainKeyword: string | null;
  isProductCode: boolean;
  rawQuery: string;
  confidence: number;
}

export class SearchIntentParser {
  // ✅ DANH SÁCH TỪ KHÓA THEO LOẠI
  private static readonly CATEGORY_MAP: Record<string, string[]> = {
    'áo': ['áo', 'shirt', 'top', 'a'],
    'quần': ['quần', 'pants', 'trousers', 'q'],
    'váy': ['váy', 'dress', 'v'],
    'đầm': ['đầm', 'dress'],
    'chân váy': ['chân váy', 'skirt'],
    'giày': ['giày', 'shoes', 'sneakers', 'g'],
    'túi': ['túi', 'bag', 'tote', 't'],
    'balo': ['balo', 'backpack', 'b'],
    'mũ': ['mũ', 'hat', 'cap', 'm'],
    'khăn': ['khăn', 'scarf', 'k'],
  };

  private static readonly BRAND_MAP: Record<string, string[]> = {
    'Nike': ['nike'],
    'Adidas': ['adidas'],
    'Gucci': ['gucci'],
    'Puma': ['puma'],
    'Zara': ['zara'],
    'H&M': ['h&m', 'hm'],
    'Uniqlo': ['uniqlo'],
    'Routine': ['routine'],
    'Coolmate': ['coolmate'],
    'Canifa': ['canifa'],
  };

  private static readonly COLOR_MAP: Record<string, string[]> = {
    'đen': ['đen', 'black', 'den'],
    'trắng': ['trắng', 'white', 'trang'],
    'xanh dương': ['xanh dương', 'navy', 'blue'],
    'xanh lá': ['xanh lá', 'green'],
    'đỏ': ['đỏ', 'red', 'do'],
    'vàng': ['vàng', 'yellow', 'gold', 'vang'],
    'hồng': ['hồng', 'pink', 'rose', 'hong'],
    'tím': ['tím', 'purple', 'violet', 'tim'],
    'nâu': ['nâu', 'brown', 'nau'],
    'xám': ['xám', 'gray', 'grey', 'xam'],
    'be': ['be', 'beige', 'kem'],
    'cam': ['cam', 'orange'],
  };

  private static readonly STYLE_MAP: Record<string, string[]> = {
    'basic': ['basic', 'cơ bản', 'đơn giản'],
    'minimal': ['minimal', 'tối giản'],
    'streetwear': ['streetwear', 'street', 'đường phố'],
    'vintage': ['vintage', 'cổ', 'retro'],
    'sport': ['sport', 'thể thao', 'năng động'],
    'luxury': ['luxury', 'sang trọng', 'cao cấp'],
    'công sở': ['công sở', 'văn phòng', 'office'],
    'hàn quốc': ['hàn quốc', 'korean'],
    'nhật bản': ['nhật bản', 'japanese'],
    'old money': ['old money', 'oldmoney'],
    'y2k': ['y2k', '2000s'],
    'darkwear': ['darkwear', 'dark'],
  };

  /**
   * ✅ PHÂN TÍCH Ý ĐỊNH
   */
  static parse(query: string): SearchIntent {
    const normalized = query.toLowerCase().trim();
    const tokens = normalized.split(/\s+/);
    
    const intent: SearchIntent = {
      categories: [],
      brands: [],
      colors: [],
      sizes: [],
      materials: [],
      styles: [],
      occasions: [],
      seasons: [],
      patterns: [],
      fits: [],
      collars: [],
      sleeves: [],
      gender: null,
      priceRange: { min: null, max: null },
      isSale: false,
      inStock: true,
      trends: [],
      mainKeyword: null,
      isProductCode: false,
      rawQuery: query,
      confidence: 0,
    };

    let matchedCount = 0;
    const totalTokens = tokens.length;

    // 1️⃣ PHÁT HIỆN DANH MỤC
    for (const [category, keywords] of Object.entries(this.CATEGORY_MAP)) {
      if (keywords.some(k => normalized.includes(k))) {
        intent.categories.push(category);
        matchedCount++;
      }
    }

    // 2️⃣ PHÁT HIỆN THƯƠNG HIỆU
    for (const [brand, keywords] of Object.entries(this.BRAND_MAP)) {
      if (keywords.some(k => normalized.includes(k))) {
        intent.brands.push(brand);
        matchedCount++;
      }
    }

    // 3️⃣ PHÁT HIỆN MÀU SẮC
    for (const [color, keywords] of Object.entries(this.COLOR_MAP)) {
      if (keywords.some(k => normalized.includes(k))) {
        intent.colors.push(color);
        matchedCount++;
      }
    }

    // 4️⃣ PHÁT HIỆN SIZE
    const sizePatterns = [
      /\b([SMLXL]+)\b/i,
      /\bsize\s*([SMLXL]+)\b/i,
      /\b(32|34|36|38|40|42|44)\b/,
    ];
    for (const pattern of sizePatterns) {
      const match = normalized.match(pattern);
      if (match) {
        intent.sizes.push(match[1].toUpperCase());
        matchedCount++;
      }
    }

    // 5️⃣ PHÁT HIỆN PHONG CÁCH
    for (const [style, keywords] of Object.entries(this.STYLE_MAP)) {
      if (keywords.some(k => normalized.includes(k))) {
        intent.styles.push(style);
        matchedCount++;
      }
    }

    // 6️⃣ PHÁT HIỆN GIỚI TÍNH
    if (normalized.includes('nam') || normalized.includes('men')) {
      intent.gender = 'nam';
      matchedCount++;
    }
    if (normalized.includes('nữ') || normalized.includes('women')) {
      intent.gender = 'nữ';
      matchedCount++;
    }
    if (normalized.includes('unisex')) {
      intent.gender = 'unisex';
      matchedCount++;
    }

    // 7️⃣ PHÁT HIỆN GIÁ
    const pricePatterns = [
      /dưới\s*(\d+)\s*(k|nghìn|ngàn|trăm|triệu)/i,
      /trên\s*(\d+)\s*(k|nghìn|ngàn|trăm|triệu)/i,
      /(\d+)\s*(k|nghìn|ngàn|trăm|triệu)\s*(đến|-)\s*(\d+)\s*(k|nghìn|ngàn|trăm|triệu)/i,
      /(\d+)\s*-\s*(\d+)\s*(k|nghìn|ngàn|trăm|triệu)/i,
    ];
    for (const pattern of pricePatterns) {
      const match = normalized.match(pattern);
      if (match) {
        const value1 = parseInt(match[1]);
        const unit1 = match[2] || '';
        const price1 = this.parsePrice(value1, unit1);
        
        if (match[4] && match[5]) {
          const value2 = parseInt(match[4]);
          const unit2 = match[5];
          const price2 = this.parsePrice(value2, unit2);
          intent.priceRange.min = price1;
          intent.priceRange.max = price2;
          matchedCount++;
        } else if (match[0].includes('dưới')) {
          intent.priceRange.max = price1;
          matchedCount++;
        } else if (match[0].includes('trên')) {
          intent.priceRange.min = price1;
          matchedCount++;
        }
        break;
      }
    }

    // 8️⃣ PHÁT HIỆN GIẢM GIÁ
    if (normalized.includes('sale') || normalized.includes('giảm giá') || normalized.includes('khuyến mãi')) {
      intent.isSale = true;
      matchedCount++;
    }

    // 9️⃣ TÌM TỪ KHÓA CHÍNH
    const stopWords = ['tìm', 'kiếm', 'sản', 'phẩm', 'cho', 'với', 'có', 'màu', 'size', 'giá'];
    const remainingTokens = tokens.filter(t => 
      !stopWords.includes(t) && 
      !intent.categories.some(c => t.includes(c)) &&
      !intent.colors.some(c => t.includes(c))
    );
    if (remainingTokens.length > 0) {
      intent.mainKeyword = remainingTokens.join(' ');
      matchedCount++;
    }

    // 🔟 TÍNH ĐỘ TIN CẬY
    intent.confidence = totalTokens > 0 ? Math.min((matchedCount / totalTokens) * 100, 100) : 0;

    return intent;
  }

  /**
   * ✅ CHUYỂN ĐỔI GIÁ
   */
  private static parsePrice(value: number, unit: string): number {
    if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') return value * 1000;
    if (unit === 'trăm') return value * 100000;
    if (unit === 'triệu') return value * 1000000;
    return value;
  }

  /**
   * ✅ XÂY DỰNG FILTER
   */
  static buildFilters(intent: SearchIntent): any {
    const filters: any = {};
    if (intent.categories.length > 0) filters.categories = intent.categories;
    if (intent.brands.length > 0) filters.brands = intent.brands;
    if (intent.colors.length > 0) filters.colors = intent.colors;
    if (intent.sizes.length > 0) filters.sizes = intent.sizes;
    if (intent.styles.length > 0) filters.styles = intent.styles;
    if (intent.gender) filters.gender = intent.gender;
    if (intent.priceRange.min !== null || intent.priceRange.max !== null) {
      filters.priceRange = {
        min: intent.priceRange.min || 0,
        max: intent.priceRange.max || Number.MAX_SAFE_INTEGER,
      };
    }
    if (intent.isSale) filters.isSale = true;
    return filters;
  }

  /**
   * ✅ MÔ TẢ INTENT
   */
  static describe(intent: SearchIntent): string {
    const parts: string[] = [];
    if (intent.categories.length > 0) parts.push(`danh mục: ${intent.categories.join(', ')}`);
    if (intent.brands.length > 0) parts.push(`thương hiệu: ${intent.brands.join(', ')}`);
    if (intent.colors.length > 0) parts.push(`màu: ${intent.colors.join(', ')}`);
    if (intent.sizes.length > 0) parts.push(`size: ${intent.sizes.join(', ')}`);
    if (intent.styles.length > 0) parts.push(`phong cách: ${intent.styles.join(', ')}`);
    if (intent.gender) parts.push(`giới tính: ${intent.gender}`);
    if (intent.priceRange.min || intent.priceRange.max) {
      const min = intent.priceRange.min || 0;
      const max = intent.priceRange.max || '∞';
      parts.push(`giá: ${min.toLocaleString()}đ - ${max === '∞' ? 'trên' : max.toLocaleString()}đ`);
    }
    if (intent.isSale) parts.push('đang giảm giá');
    if (intent.mainKeyword) parts.push(`từ khóa: "${intent.mainKeyword}"`);
    return parts.length > 0 ? parts.join(', ') : 'không xác định';
  }
}