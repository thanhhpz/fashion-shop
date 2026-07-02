// src/modules/search/thuat_toan_search/search-engine.ts

import { VietnameseProcessor } from './vietnamese-processor';
import { SearchIntentParser, SearchIntent } from './search-intent';

export interface SearchResult {
  product: any;
  score: number;
  matchType: 'exact' | 'fuzzy' | 'synonym' | 'partial' | 'popular' | 'fallback' | 'intent';
  matchedTokens: string[];
  matchedFilters: string[];
  details: {
    tokenScore: number;
    synonymScore: number;
    fuzzyScore: number;
    popularityScore: number;
    intentScore: number;
    exactMatch: boolean;
  };
}

export class SearchEngine {
  private products: any[];
  private searchCache: Map<string, SearchResult[]> = new Map();

  constructor(products: any[]) {
    this.products = products;
  }

  /**
   * ✅ MAIN SEARCH
   */
  search(query: string, limit: number = 12): SearchResult[] {
    if (!query || query.length < 1) {
      return this.getPopularProducts(limit);
    }

    const cacheKey = `${query}_${limit}`;
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    // 🔥 XỬ LÝ QUERY (TỰ ĐỘNG SỬA LỖI)
    const processed = VietnameseProcessor.processQuery(query);
    
    console.log('🔍 Search Engine:', {
      original: query,
      corrected: processed.corrected,
      expanded: processed.expanded,
      tokens: processed.tokens,
    });

    const searchQuery = processed.expanded || processed.corrected || query;
    const intent = SearchIntentParser.parse(searchQuery);
    const filters = SearchIntentParser.buildFilters(intent);
    
    console.log('🧠 Intent:', {
      query: searchQuery,
      intent: SearchIntentParser.describe(intent),
      confidence: intent.confidence,
    });

    // THỰC HIỆN TÌM KIẾM
    let results: SearchResult[] = [];

    // Strategy 1: Intent-based Search
    if (Object.keys(filters).length > 0 && intent.confidence > 30) {
      const intentResults = this.searchByIntent(intent, filters, limit * 2);
      results.push(...intentResults);
    }

    // Strategy 2: Exact Match
    const exactResults = this.searchExact(processed.expandedTokens, limit);
    results.push(...exactResults);

    // Strategy 3: Token Match
    const tokenResults = this.searchTokenMatch(processed.tokens, limit * 2);
    results.push(...tokenResults);

    // Strategy 4: Synonym Match
    const synonymResults = this.searchSynonymMatch(processed.tokens, limit);
    results.push(...synonymResults);

    // Strategy 5: Fuzzy Match
    const fuzzyResults = this.searchFuzzyMatch(processed.tokens, limit);
    results.push(...fuzzyResults);

    // Strategy 6: Main Keyword
    if (intent.mainKeyword) {
      const mainKeywordResults = this.searchByMainKeyword(intent.mainKeyword, limit);
      results.push(...mainKeywordResults);
    }

    // DEDUPLICATE & SORT
    let finalResults = this.deduplicateAndSort(results, limit);
    
    // FALLBACK
    if (finalResults.length === 0) {
      finalResults = this.fallbackSearch(processed, intent, limit);
    }

    this.searchCache.set(cacheKey, finalResults);
    return finalResults;
  }

  /**
   * ✅ TÌM THEO INTENT
   */
  private searchByIntent(intent: SearchIntent, filters: any, limit: number): SearchResult[] {
    const results: SearchResult[] = [];

    for (const product of this.products) {
      let score = 0;
      const matchedFilters: string[] = [];
      const productName = VietnameseProcessor.normalize(product.ten_san_pham || '');

      // Kiểm tra danh mục
      if (filters.categories?.length > 0) {
        const categoryMatch = filters.categories.some((cat: string) => {
          const normalizedCat = VietnameseProcessor.normalize(cat);
          return productName.includes(normalizedCat) ||
                 (product.danh_muc?.ten_danh_muc && 
                  VietnameseProcessor.normalize(product.danh_muc.ten_danh_muc).includes(normalizedCat));
        });
        if (categoryMatch) { score += 25; matchedFilters.push('category'); }
      }

      // Kiểm tra thương hiệu
      if (filters.brands?.length > 0 && product.thuong_hieu) {
        const brandMatch = filters.brands.some((brand: string) => {
          const normalizedBrand = VietnameseProcessor.normalize(brand);
          return VietnameseProcessor.normalize(product.thuong_hieu.ten_thuong_hieu || '').includes(normalizedBrand);
        });
        if (brandMatch) { score += 20; matchedFilters.push('brand'); }
      }

      // Kiểm tra màu sắc
      if (filters.colors?.length > 0 && product.colors) {
        const colorMatch = filters.colors.some((color: string) => {
          const normalizedColor = VietnameseProcessor.normalize(color);
          return product.colors.some((c: any) => {
            const productColor = VietnameseProcessor.normalize(c.ten_mau || '');
            return productColor.includes(normalizedColor) ||
                   VietnameseProcessor.similarity(productColor, normalizedColor) > 60;
          });
        });
        if (colorMatch) { score += 15; matchedFilters.push('color'); }
      }

      // Kiểm tra size
      if (filters.sizes?.length > 0 && product.sizes) {
        const sizeMatch = filters.sizes.some((size: string) => {
          const normalizedSize = size.toUpperCase();
          return product.sizes.some((s: any) => {
            return (s.ten_kich_co?.toUpperCase() || '') === normalizedSize;
          });
        });
        if (sizeMatch) { score += 10; matchedFilters.push('size'); }
      }

      // Kiểm tra phong cách
      if (filters.styles?.length > 0) {
        const styleMatch = filters.styles.some((style: string) => {
          const normalizedStyle = VietnameseProcessor.normalize(style);
          return productName.includes(normalizedStyle);
        });
        if (styleMatch) { score += 20; matchedFilters.push('style'); }
      }

      // Kiểm tra giới tính
      if (filters.gender) {
        const genderNormalized = VietnameseProcessor.normalize(filters.gender);
        if (genderNormalized === 'nam' && !productName.includes('nữ')) {
          score += 10; matchedFilters.push('gender');
        } else if (genderNormalized === 'nữ' && !productName.includes('nam')) {
          score += 10; matchedFilters.push('gender');
        }
      }

      // Kiểm tra giá
      if (filters.priceRange) {
        const price = product.min_price || 0;
        if (price >= filters.priceRange.min && price <= filters.priceRange.max) {
          score += 15; matchedFilters.push('price');
        }
      }

      // Kiểm tra giảm giá
      if (filters.isSale) {
        const price = product.min_price || 0;
        const originalPrice = product.gia_niem_yet || 0;
        if (originalPrice > price) {
          score += 15; matchedFilters.push('sale');
        }
      }

      // Popularity bonus
      const popBonus = this.getPopularityScore(product) / 10;
      score += popBonus;

      if (score > 0) {
        results.push({
          product,
          score: Math.min(score + 30, 100),
          matchType: 'intent',
          matchedTokens: [],
          matchedFilters,
          details: {
            tokenScore: 0,
            synonymScore: 0,
            fuzzyScore: 0,
            popularityScore: popBonus,
            intentScore: score,
            exactMatch: false,
          },
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * ✅ TÌM CHÍNH XÁC
   */
  private searchExact(tokens: string[], limit: number): SearchResult[] {
    const results: SearchResult[] = [];
    const queryText = tokens.join(' ');

    for (const product of this.products) {
      const productName = VietnameseProcessor.normalize(product.ten_san_pham);
      if (productName.includes(queryText)) {
        results.push({
          product,
          score: 100,
          matchType: 'exact',
          matchedTokens: tokens,
          matchedFilters: [],
          details: {
            tokenScore: 100,
            synonymScore: 0,
            fuzzyScore: 0,
            popularityScore: 0,
            intentScore: 0,
            exactMatch: true,
          },
        });
      }
    }
    return results.slice(0, limit);
  }

  /**
   * ✅ TÌM THEO MAIN KEYWORD
   */
  private searchByMainKeyword(keyword: string, limit: number): SearchResult[] {
    const results: SearchResult[] = [];
    const normalizedKeyword = VietnameseProcessor.normalize(keyword);
    const tokens = VietnameseProcessor.tokenize(normalizedKeyword);

    for (const product of this.products) {
      const productName = VietnameseProcessor.normalize(product.ten_san_pham);
      let score = 0;

      if (productName.includes(normalizedKeyword)) {
        score = 70;
      } else {
        let matchCount = 0;
        for (const token of tokens) {
          if (productName.includes(token)) matchCount++;
        }
        if (matchCount > 0) {
          score = (matchCount / tokens.length) * 50;
        }
      }

      if (score > 0) {
        results.push({
          product,
          score: Math.min(score + 20, 100),
          matchType: 'partial',
          matchedTokens: tokens,
          matchedFilters: ['main_keyword'],
          details: {
            tokenScore: score,
            synonymScore: 0,
            fuzzyScore: 0,
            popularityScore: 0,
            intentScore: 0,
            exactMatch: false,
          },
        });
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * ✅ TÌM THEO TOKEN
   */
  private searchTokenMatch(tokens: string[], limit: number): SearchResult[] {
    const results: SearchResult[] = [];

    for (const product of this.products) {
      const productName = VietnameseProcessor.normalize(product.ten_san_pham);
      const productTokens = VietnameseProcessor.tokenize(productName);
      
      let matchCount = 0;
      let totalScore = 0;
      const matchedTokens: string[] = [];

      for (const qToken of tokens) {
        let bestScore = 0;
        let bestToken = '';

        for (const pToken of productTokens) {
          if (qToken === pToken) {
            bestScore = 100;
            bestToken = pToken;
            break;
          }

          if (pToken.includes(qToken) || qToken.includes(pToken)) {
            const ratio = Math.min(pToken.length, qToken.length) / Math.max(pToken.length, qToken.length);
            bestScore = Math.max(bestScore, 50 + ratio * 40);
            bestToken = pToken;
          }

          const similarity = VietnameseProcessor.similarity(qToken, pToken);
          if (similarity > bestScore) {
            bestScore = similarity;
            bestToken = pToken;
          }
        }

        let threshold = 55;
        if (qToken.length <= 2) threshold = 35;
        else if (qToken.length <= 3) threshold = 45;

        if (bestScore >= threshold) {
          matchCount++;
          totalScore += bestScore;
          if (bestToken) matchedTokens.push(bestToken);
        }
      }

      const matchRatio = tokens.length > 0 ? matchCount / tokens.length : 0;
      
      let requiredRatio = 0.75;
      if (tokens.length === 1) requiredRatio = 0.4;
      else if (tokens.length === 2) requiredRatio = 0.85;

      // Penalty cho token dài không match
      let penalty = 0;
      for (const qToken of tokens) {
        if (qToken.length >= 3) {
          const hasMatch = matchedTokens.some(m => 
            m.includes(qToken) || qToken.includes(m) || 
            VietnameseProcessor.similarity(qToken, m) > 70
          );
          if (!hasMatch) penalty += 20;
        }
      }

      if (matchRatio >= requiredRatio && matchCount > 0) {
        const score = (totalScore / tokens.length) * (0.7 + matchRatio * 0.3);
        const bonus = (matchCount / tokens.length) * 20;
        const finalScore = Math.max(0, Math.min(score + bonus - penalty, 100));
        
        results.push({
          product,
          score: finalScore,
          matchType: matchRatio >= 0.9 ? 'fuzzy' : 'partial',
          matchedTokens,
          matchedFilters: [],
          details: {
            tokenScore: score,
            synonymScore: 0,
            fuzzyScore: 0,
            popularityScore: 0,
            intentScore: 0,
            exactMatch: false,
          },
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * ✅ TÌM THEO TỪ ĐỒNG NGHĨA
   */
  private searchSynonymMatch(tokens: string[], limit: number): SearchResult[] {
    const results: SearchResult[] = [];

    for (const product of this.products) {
      const productName = VietnameseProcessor.normalize(product.ten_san_pham);
      const productTokens = VietnameseProcessor.tokenize(productName);
      
      let matchCount = 0;
      let totalScore = 0;

      for (const qToken of tokens) {
        for (const pToken of productTokens) {
          if (VietnameseProcessor.areSynonyms(qToken, pToken)) {
            matchCount++;
            totalScore += 80;
            break;
          }
        }
      }

      if (matchCount > 0) {
        const matchRatio = tokens.length > 0 ? matchCount / tokens.length : 0;
        const score = (totalScore / tokens.length) * (0.8 + matchRatio * 0.2);

        results.push({
          product,
          score: Math.min(score, 100),
          matchType: 'synonym',
          matchedTokens: [],
          matchedFilters: ['synonym'],
          details: {
            tokenScore: 0,
            synonymScore: score,
            fuzzyScore: 0,
            popularityScore: 0,
            intentScore: 0,
            exactMatch: false,
          },
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * ✅ TÌM MỜ (FUZZY)
   */
  private searchFuzzyMatch(tokens: string[], limit: number): SearchResult[] {
    const results: SearchResult[] = [];

    for (const product of this.products) {
      const productName = VietnameseProcessor.normalize(product.ten_san_pham);
      const productTokens = VietnameseProcessor.tokenize(productName);
      
      let matchCount = 0;
      let totalScore = 0;

      for (const qToken of tokens) {
        let bestScore = 0;
        for (const pToken of productTokens) {
          const similarity = VietnameseProcessor.similarity(qToken, pToken);
          if (similarity > bestScore) bestScore = similarity;
        }

        let threshold = 50;
        if (qToken.length <= 2) threshold = 30;
        else if (qToken.length <= 3) threshold = 40;

        if (bestScore >= threshold) {
          matchCount++;
          totalScore += bestScore;
        }
      }

      const matchRatio = tokens.length > 0 ? matchCount / tokens.length : 0;
      
      if (matchRatio > 0.3 && matchCount > 0) {
        const score = (totalScore / tokens.length) * 0.7;

        results.push({
          product,
          score: Math.min(score, 100),
          matchType: 'fuzzy',
          matchedTokens: tokens,
          matchedFilters: ['fuzzy'],
          details: {
            tokenScore: 0,
            synonymScore: 0,
            fuzzyScore: score,
            popularityScore: 0,
            intentScore: 0,
            exactMatch: false,
          },
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * ✅ LẤY ĐIỂM PHỔ BIẾN
   */
  private getPopularityScore(product: any): number {
    let score = 0;
    score += (product.luot_xem || 0) / 100;
    score += (product.sold || 0) * 2;
    score += (product.rating || 0) * 5;
    if (product.noi_bat) score += 20;
    return score;
  }

  /**
   * ✅ DEDUPLICATE & SORT
   */
  private deduplicateAndSort(results: SearchResult[], limit: number): SearchResult[] {
    const uniqueMap = new Map<number, SearchResult>();
    
    const priorityMap = {
      'exact': 100,
      'intent': 90,
      'fuzzy': 80,
      'synonym': 70,
      'partial': 60,
      'popular': 30,
      'fallback': 10,
    };

    for (const result of results) {
      const id = result.product.id;
      const priority = priorityMap[result.matchType] || 0;
      const weightedScore = result.score + priority;

      if (uniqueMap.has(id)) {
        const existing = uniqueMap.get(id)!;
        if (weightedScore > existing.score + (priorityMap[existing.matchType] || 0)) {
          uniqueMap.set(id, result);
        }
      } else {
        uniqueMap.set(id, result);
      }
    }

    return Array.from(uniqueMap.values())
      .sort((a, b) => {
        const priorityA = priorityMap[a.matchType] || 0;
        const priorityB = priorityMap[b.matchType] || 0;
        if (priorityA !== priorityB) return priorityB - priorityA;
        return b.score - a.score;
      })
      .slice(0, limit);
  }

  /**
   * ✅ FALLBACK SEARCH
   */
  private fallbackSearch(processed: any, intent: SearchIntent, limit: number): SearchResult[] {
    const { tokens } = processed;
    
    for (const token of tokens) {
      if (token.length >= 2) {
        const fallbackResults = this.searchFuzzyMatch([token], limit);
        if (fallbackResults.length > 0) return fallbackResults;
      }
    }
    
    return this.getPopularProducts(limit);
  }

  /**
   * ✅ LẤY SẢN PHẨM PHỔ BIẾN
   */
  private getPopularProducts(limit: number): SearchResult[] {
    return this.products
      .filter(p => p.trang_thai === 'Đang bán')
      .sort((a, b) => this.getPopularityScore(b) - this.getPopularityScore(a))
      .slice(0, limit)
      .map(p => ({
        product: p,
        score: 50,
        matchType: 'popular' as const,
        matchedTokens: [],
        matchedFilters: ['popular'],
        details: {
          tokenScore: 0,
          synonymScore: 0,
          fuzzyScore: 0,
          popularityScore: 100,
          intentScore: 0,
          exactMatch: false,
        },
      }));
  }

  /**
   * ✅ GỢI Ý TỪ KHÓA
   */
  suggest(query: string, limit: number = 10): string[] {
    if (!query || query.length < 1) return this.getPopularKeywords(limit);

    const processed = VietnameseProcessor.processQuery(query);
    const suggestions = new Set<string>();

    for (const suggestion of processed.suggestions) {
      suggestions.add(suggestion);
    }

    const searchResults = this.search(query, limit * 3);
    for (const result of searchResults) {
      const name = result.product.ten_san_pham;
      if (name.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(name);
      }
    }

    for (const product of this.products) {
      if (product.danh_muc?.ten_danh_muc) {
        const categoryName = product.danh_muc.ten_danh_muc;
        if (VietnameseProcessor.normalize(categoryName).includes(VietnameseProcessor.normalize(query))) {
          suggestions.add(categoryName);
        }
      }
      if (product.thuong_hieu?.ten_thuong_hieu) {
        const brandName = product.thuong_hieu.ten_thuong_hieu;
        if (VietnameseProcessor.normalize(brandName).includes(VietnameseProcessor.normalize(query))) {
          suggestions.add(brandName);
        }
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * ✅ LẤY TỪ KHÓA PHỔ BIẾN
   */
  private getPopularKeywords(limit: number): string[] {
    const popular = this.products
      .sort((a, b) => (b.sold || 0) - (a.sold || 0))
      .slice(0, limit * 2);

    const keywords = popular.map(p => {
      const tokens = VietnameseProcessor.tokenize(p.ten_san_pham);
      return tokens.sort((a, b) => b.length - a.length)[0] || p.ten_san_pham;
    });

    return [...new Set(keywords)].slice(0, limit);
  }

  /**
   * ✅ TÌM SẢN PHẨM TƯƠNG TỰ
   */
  findRelated(productId: number, limit: number = 6): any[] {
    const product = this.products.find(p => p.id === productId);
    if (!product) return [];

    const related = this.products
      .filter(p => p.id !== productId && p.trang_thai === 'Đang bán')
      .map(p => ({
        product: p,
        score: 0,
        reasons: [] as string[],
      }));

    for (const item of related) {
      if (item.product.danh_muc_id === product.danh_muc_id) {
        item.score += 40;
        item.reasons.push('Cùng danh mục');
      }
      if (item.product.thuong_hieu_id === product.thuong_hieu_id) {
        item.score += 30;
        item.reasons.push('Cùng thương hiệu');
      }
      
      const productColors = product.colors?.map((c: any) => c.id) || [];
      const itemColors = item.product.colors?.map((c: any) => c.id) || [];
      const commonColors = productColors.filter(id => itemColors.includes(id));
      if (commonColors.length > 0) {
        item.score += 15;
        item.reasons.push('Cùng màu sắc');
      }
      
      const priceDiff = Math.abs((product.min_price || 0) - (item.product.min_price || 0));
      if (priceDiff < 100000) {
        item.score += 10;
        item.reasons.push('Giá tương tự');
      }
      
      const productName = VietnameseProcessor.normalize(product.ten_san_pham);
      const itemName = VietnameseProcessor.normalize(item.product.ten_san_pham);
      if (VietnameseProcessor.similarity(productName, itemName) > 50) {
        item.score += 10;
        item.reasons.push('Phong cách tương tự');
      }
      
      item.score += this.getPopularityScore(item.product) / 100;
    }

    return related
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => ({
        ...item.product,
        reasons: item.reasons,
        similarityScore: Math.min(item.score, 100),
      }));
  }
}