// src/modules/search/thuat_toan_search/vietnamese-processor.ts

/**
 * VIETNAMESE PROCESSOR - XỬ LÝ TIẾNG VIỆT THÔNG MINH
 * Tự động phát hiện và sửa lỗi chính tả bằng thuật toán
 */

export class VietnameseProcessor {
  // ✅ TỪ ĐIỂN CƠ BẢN (CHỈ CẦN TỪ ĐÚNG)
  private static readonly DICTIONARY: string[] = [
    // ===== DANH MỤC =====
    'áo', 'quần', 'giày', 'váy', 'đầm', 'túi', 'balo', 'mũ', 'khăn',
    'chân váy', 'áo thun', 'áo sơ mi', 'áo khoác', 'áo len', 'áo polo',
    'áo hoodie', 'áo bomber', 'áo blazer', 'áo cardigan',
    'quần jeans', 'quần short', 'quần âu', 'quần kaki', 'quần baggy',
    'quần skinny', 'quần jogger', 'quần cargo',
    
    // ===== THƯƠNG HIỆU =====
    'nike', 'adidas', 'gucci', 'puma', 'zara', 'hm', 'uniqlo',
    'routine', 'coolmate', 'canifa', '5s fashion',
    
    // ===== MÀU SẮC =====
    'đen', 'trắng', 'xanh', 'đỏ', 'vàng', 'hồng', 'tím', 'nâu', 'xám',
    'be', 'cam', 'bạc', 'xanh dương', 'xanh lá', 'hồng pastel',
    'vàng kim', 'kem', 'ghi',
    
    // ===== CHẤT LIỆU =====
    'cotton', 'len', 'da', 'lụa', 'kaki', 'denim', 'linen', 'cashmere',
    'vải thun', 'nỉ', 'satin', 'jean', 'bông',
    
    // ===== PHONG CÁCH =====
    'basic', 'minimal', 'streetwear', 'vintage', 'sport', 'luxury',
    'công sở', 'hàn quốc', 'nhật bản', 'old money', 'clean fit',
    'y2k', 'coquette', 'darkwear', 'local brand', 'thể thao',
    'năng động', 'sang trọng', 'cá tính',
    
    // ===== DỊP SỬ DỤNG =====
    'đi làm', 'đi học', 'đi chơi', 'đi tiệc', 'đám cưới',
    'phỏng vấn', 'hẹn hò', 'du lịch', 'gym', 'chạy bộ',
    'dã ngoại', 'biển',
    
    // ===== MÙA =====
    'mùa hè', 'mùa đông', 'mùa xuân', 'mùa thu',
    'hè', 'đông', 'xuân', 'thu',
    
    // ===== HỌA TIẾT =====
    'sọc', 'caro', 'trơn', 'hoa', 'graphic', 'logo', 'chấm bi',
    'kẻ sọc', 'kẻ caro', 'họa tiết',
    
    // ===== KIỂU DÁNG =====
    'oversize', 'slim fit', 'regular fit', 'wide leg',
    'croptop', 'ống đứng', 'ống loe', 'baggy', 'skinny',
    'rộng', 'ôm', 'vừa', 'suông',
    
    // ===== LOẠI CỔ ÁO =====
    'cổ tròn', 'cổ tim', 'cổ polo', 'cổ lọ', 'cổ thuyền',
    'cổ đức', 'cổ vest',
    
    // ===== LOẠI TAY ÁO =====
    'tay dài', 'tay ngắn', 'ba lỗ', 'tay lỡ',
    'dài tay', 'ngắn tay', 'không tay',
    
    // ===== GIỚI TÍNH =====
    'nam', 'nữ', 'unisex', 'men', 'women',
    
    // ===== XU HƯỚNG =====
    'hot trend', 'viral', 'best seller', 'new arrival',
    'bán chạy', 'mới về', 'hot',
  ];

  /**
   * ✅ BỎ DẤU TIẾNG VIỆT
   */
  static removeAccent(text: string): string {
    if (!text) return '';
    const accentMap: Record<string, string> = {
      'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
      'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
      'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
      'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
      'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
      'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
      'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
      'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
      'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
      'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
      'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
      'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
      'đ': 'd',
    };
    
    return text.toLowerCase()
      .split('')
      .map(char => accentMap[char] || char)
      .join('');
  }

  /**
   * ✅ CHUẨN HÓA TEXT
   */
  static normalize(text: string): string {
    if (!text) return '';
    return this.removeAccent(text)
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * ✅ TÁCH TOKEN
   */
  static tokenize(text: string): string[] {
    if (!text) return [];
    const normalized = this.normalize(text);
    return normalized.split(/\s+/).filter(t => t.length > 0);
  }

  /**
   * ✅ TÍNH LEVENSHTEIN DISTANCE
   */
  static levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          );
        }
      }
    }
    
    return dp[m][n];
  }

  /**
   * ✅ TÍNH ĐỘ TƯƠNG ĐỒNG GIỮA 2 CHUỖI (0-100)
   */
  static similarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const n1 = this.normalize(str1);
    const n2 = this.normalize(str2);
    
    if (n1 === n2) return 100;
    if (n1.includes(n2) || n2.includes(n1)) {
      const ratio = Math.min(n1.length, n2.length) / Math.max(n1.length, n2.length);
      return 80 + (ratio * 20);
    }
    
    const distance = this.levenshteinDistance(n1, n2);
    const maxLen = Math.max(n1.length, n2.length);
    if (maxLen === 0) return 0;
    
    return ((maxLen - distance) / maxLen) * 100;
  }

  /**
   * ✅ TỰ ĐỘNG SỬA LỖI CHÍNH TẢ CHO 1 TỪ
   */
  static autoCorrectWord(word: string, threshold: number = 65): string | null {
    if (!word || word.length < 2) return null;
    
    const normalizedWord = this.normalize(word);
    let bestMatch: string | null = null;
    let bestScore = 0;
    
    for (const dictWord of this.DICTIONARY) {
      const normalizedDict = this.normalize(dictWord);
      
      // Nếu giống nhau chính xác
      if (normalizedWord === normalizedDict) {
        return dictWord;
      }
      
      // Nếu từ cần sửa chứa từ trong từ điển hoặc ngược lại
      if (normalizedDict.includes(normalizedWord) || normalizedWord.includes(normalizedDict)) {
        const score = (Math.min(normalizedWord.length, normalizedDict.length) / 
                       Math.max(normalizedWord.length, normalizedDict.length)) * 100;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = dictWord;
        }
      }
      
      // Tính similarity bằng Levenshtein
      const similarity = this.similarity(normalizedWord, normalizedDict);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = dictWord;
      }
    }
    
    // Chỉ trả về nếu độ tương đồng >= threshold
    return bestScore >= threshold ? bestMatch : null;
  }

  /**
   * ✅ TỰ ĐỘNG SỬA TOÀN BỘ QUERY
   */
  static autoCorrectQuery(query: string): string {
    if (!query) return query;
    
    const tokens = query.toLowerCase().trim().split(/\s+/);
    const correctedTokens: string[] = [];
    let changed = false;
    
    for (const token of tokens) {
      // Bỏ qua token quá ngắn (1 ký tự) hoặc là số
      if (token.length <= 1 || /^\d+$/.test(token)) {
        correctedTokens.push(token);
        continue;
      }
      
      // Tìm từ đúng gần nhất
      const corrected = this.autoCorrectWord(token, 60);
      if (corrected && corrected !== token) {
        correctedTokens.push(corrected);
        changed = true;
      } else {
        correctedTokens.push(token);
      }
    }
    
    const result = correctedTokens.join(' ');
    return changed ? result : query;
  }

  /**
   * ✅ TỰ ĐỘNG TÁCH TỪ VIẾT LIỀN
   */
  static autoSplitCompound(text: string): string[] {
    if (!text || text.length < 3) return [text];
    
    const normalized = this.normalize(text).replace(/\s/g, '');
    const results: string[] = [];
    let i = 0;
    
    while (i < normalized.length) {
      let found = false;
      let maxLen = 0;
      let bestWord = '';
      
      // Thử match với các từ trong DICTIONARY
      for (const dictWord of this.DICTIONARY) {
        const normalizedDict = this.normalize(dictWord);
        if (normalized.startsWith(normalizedDict, i)) {
          if (normalizedDict.length > maxLen) {
            maxLen = normalizedDict.length;
            bestWord = dictWord;
            found = true;
          }
        }
      }
      
      if (found) {
        results.push(bestWord);
        i += maxLen;
      } else {
        results.push(normalized[i]);
        i++;
      }
    }
    
    return results.length > 1 ? results : [text];
  }

  /**
   * ✅ MỞ RỘNG VIẾT TẮT
   */
  static expandAbbreviations(text: string): string {
    if (!text) return text;
    
    const tokens = text.toLowerCase().split(/\s+/);
    const expandedTokens: string[] = [];
    
    const abbreviationMap: Record<string, string> = {
      'a': 'áo',
      'ao': 'áo',
      'q': 'quần',
      'quan': 'quần',
      'g': 'giày',
      'giay': 'giày',
      'v': 'váy',
      'vay': 'váy',
      't': 'túi',
      'tui': 'túi',
      'b': 'balo',
      'm': 'mũ',
      'mu': 'mũ',
      's': 'sơ mi',
      'sm': 'sơ mi',
      'k': 'khoác',
      'l': 'len',
      'p': 'polo',
      'h': 'hoodie',
      'j': 'jeans',
      'sh': 'short',
    };
    
    for (const token of tokens) {
      if (abbreviationMap[token]) {
        expandedTokens.push(abbreviationMap[token]);
      } else {
        expandedTokens.push(token);
      }
    }
    
    return expandedTokens.join(' ');
  }

  /**
   * ✅ XỬ LÝ QUERY THÔNG MINH (TỔNG HỢP)
   */
  static processQuery(query: string): {
    original: string;
    normalized: string;
    expanded: string;
    corrected: string;
    tokens: string[];
    expandedTokens: string[];
    suggestions: string[];
  } {
    if (!query) {
      return {
        original: '',
        normalized: '',
        expanded: '',
        corrected: '',
        tokens: [],
        expandedTokens: [],
        suggestions: [],
      };
    }
    
    // 🔥 BƯỚC 1: Tự động sửa lỗi chính tả
    const corrected = this.autoCorrectQuery(query);
    
    // 🔥 BƯỚC 2: Tách từ viết liền
    const splitResult = this.autoSplitCompound(corrected);
    let processed = splitResult.join(' ');
    
    // 🔥 BƯỚC 3: Mở rộng viết tắt
    processed = this.expandAbbreviations(processed);
    
    // 🔥 BƯỚC 4: Chuẩn hóa
    const normalized = this.normalize(processed);
    const tokens = this.tokenize(normalized);
    
    // 🔥 BƯỚC 5: Mở rộng tokens
    const expandedTokens = this.expandTokens(tokens);
    
    // 🔥 BƯỚC 6: Tạo gợi ý
    const suggestions = this.generateSuggestions(tokens);
    
    return {
      original: query,
      normalized,
      expanded: processed,
      corrected,
      tokens,
      expandedTokens,
      suggestions,
    };
  }

  /**
   * ✅ MỞ RỘNG TOKENS
   */
  private static expandTokens(tokens: string[]): string[] {
    const expanded = new Set<string>();
    
    for (const token of tokens) {
      expanded.add(token);
      // Thêm các từ đồng nghĩa hoặc liên quan
      for (const dictWord of this.DICTIONARY) {
        if (this.similarity(token, dictWord) > 70) {
          expanded.add(this.normalize(dictWord));
        }
      }
    }
    
    return Array.from(expanded);
  }

  /**
   * ✅ TẠO GỢI Ý
   */
  private static generateSuggestions(tokens: string[]): string[] {
    const suggestions: string[] = [];
    
    for (const token of tokens) {
      // Tìm từ trong từ điển có độ tương đồng cao
      for (const dictWord of this.DICTIONARY) {
        const score = this.similarity(token, dictWord);
        if (score > 50 && score < 100) {
          suggestions.push(dictWord);
        }
      }
    }
    
    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * ✅ KIỂM TRA 2 TỪ CÓ ĐỒNG NGHĨA KHÔNG
   */
  static areSynonyms(word1: string, word2: string): boolean {
    const n1 = this.normalize(word1);
    const n2 = this.normalize(word2);
    
    if (n1 === n2) return true;
    return this.similarity(word1, word2) > 70;
  }

  /**
   * ✅ KIỂM TRA TỪ CÓ TRONG TỪ ĐIỂN KHÔNG
   */
  static isInDictionary(word: string): boolean {
    const normalized = this.normalize(word);
    return this.DICTIONARY.some(d => this.normalize(d) === normalized);
  }

  /**
   * ✅ LẤY DANH SÁCH TỪ GỢI Ý CHO TỪ KHÔNG BIẾT
   */
  static getSuggestionsForUnknown(word: string, limit: number = 5): string[] {
    const normalized = this.normalize(word);
    const suggestions: { word: string; score: number }[] = [];
    
    for (const dictWord of this.DICTIONARY) {
      const normalizedDict = this.normalize(dictWord);
      const score = this.similarity(normalized, normalizedDict);
      if (score > 50) {
        suggestions.push({ word: dictWord, score });
      }
    }
    
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.word);
  }
}