// src/modules/search/algorithms/soundex.ts

/**
 * SOUNDEX
 * 
 * Công dụng: Mã hóa từ theo cách phát âm
 * Ứng dụng: Tìm kiếm khi không biết chính xác cách viết
 * 
 * Ví dụ:
 * - "Robert" → R163
 * - "Rupert" → R163 (cùng âm)
 * - "Smith" → S530
 * - "Smyth" → S530 (cùng âm)
 * 
 * Lưu ý: Soundex được thiết kế cho tiếng Anh,
 *           có thể không hiệu quả với tiếng Việt
 */

/**
 * Mã hóa Soundex cho 1 từ
 */
export function soundex(word: string): string {
  // Chuẩn hóa: lowercase, bỏ dấu
  const normalized = word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');

  if (!normalized) return '';

  // Lấy chữ cái đầu
  const firstLetter = normalized[0].toUpperCase();

  // Bảng mã hóa các chữ cái
  const soundexCodes: { [key: string]: string } = {
    'b': '1', 'f': '1', 'p': '1', 'v': '1',
    'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
    'd': '3', 't': '3',
    'l': '4',
    'm': '5', 'n': '5',
    'r': '6',
  };

  let code = firstLetter;
  let prevCode = '';

  // Duyệt từ ký tự thứ 2
  for (let i = 1; i < normalized.length; i++) {
    const char = normalized[i];
    const charCode = soundexCodes[char] || '';

    // Bỏ qua nếu trùng với code trước đó
    if (charCode && charCode !== prevCode) {
      code += charCode;
      prevCode = charCode;
    }

    // Dừng khi đã có 4 ký tự
    if (code.length === 4) break;
  }

  // Padding nếu thiếu
  return (code + '0000').slice(0, 4);
}

// So sánh 2 từ có cùng âm không
 
export function soundexMatch(word1: string, word2: string): boolean {
  return soundex(word1) === soundex(word2);
}

 // Tìm tất cả từ trong danh sách có cùng âm với từ cần tìm

export function soundexSearch(keyword: string, words: string[]): string[] {
  const keywordSoundex = soundex(keyword);
  return words.filter(word => soundex(word) === keywordSoundex);
}