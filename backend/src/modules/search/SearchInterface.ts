// src/modules/search/interfaces/search.interface.ts

export interface Suggestion {
  id: string;
  type: 'keyword' | 'product' | 'category' | 'brand';
  label: string;
  slug?: string;
  icon: string;
}

export interface TrendingKeyword {
  keyword: string;
  count: number;
}

export interface SearchFilters {
  categories: {
    id: number;
    ten_danh_muc: string;
    slug: string;
    _count: {
      san_pham: number;
    };
  }[];
  brands: {
    id: number;
    ten_thuong_hieu: string;
    _count: {
      san_pham: number;
    };
  }[];
  colors: {
    id: number;
    ten_mau: string;
    ma_hex: string;
    _count: {
      bien_the_san_pham: number;
    };
  }[];
  sizes: {
    id: number;
    ten_kich_co: string;
    _count: {
      bien_the_san_pham: number;
    };
  }[];
  priceRange: {
    min: number;
    max: number;
  };
}