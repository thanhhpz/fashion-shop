// src/modules/search/algorithms/levenshtein.ts

/**
 * LEVENSHTEIN DISTANCE
 * 
 * Công dụng: Tính số lần cần thay đổi để chuỗi A thành chuỗi B
 * Ứng dụng: Sửa lỗi chính tả, tìm từ gần giống
 * 
 * Ví dụ: "kitten" → "sitting" = 3 lần thay đổi
 *         "áoo" → "áo" = 1 lần thay đổi
 */

/**
 * Tính khoảng cách Levenshtein giữa 2 chuỗi
 */
// src/modules/search/thuat_toan_search/levenshtein.ts

export function levenshteinDistance(str1: string, str2: string): number {
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[str1.length][str2.length];
}

export function similarityPercent(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  return ((maxLen - distance) / maxLen) * 100;
}