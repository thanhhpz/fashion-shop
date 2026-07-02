// src/modules/search/algorithms/jaro-winkler.ts

/**
 * Công dụng: So sánh độ giống nhau của 2 chuỗi (tốt cho tên người, từ ngắn)
 * Ứng dụng: Tìm kiếm tên sản phẩm, tên thương hiệu
 * 
 * Điểm đặc biệt: Ưu tiên các ký tự khớp ở đầu chuỗi
 * 
 * Ví dụ: "martha" vs "marhta" = 0.94
 *        "dwayne" vs "duane" = 0.84
 * 
 * 
 * Tính Jaro Distance (0 -> 1, càng gần 1 càng giống)
 */
// src/modules/search/thuat_toan_search/jaro-winkler.ts

export function jaroWinkler(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(len2, i + matchWindow + 1);
    for (let j = start; j < end; j++) {
      if (matches2[j]) continue;
      if (str1[i] !== str2[j]) continue;
      matches1[i] = true;
      matches2[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let transpositions = 0;
  let point = 0;
  for (let i = 0; i < len1; i++) {
    if (matches1[i]) {
      while (!matches2[point]) point++;
      if (str1[i] !== str2[point]) transpositions++;
      point++;
    }
  }
  transpositions = Math.floor(transpositions / 2);

  const jaro = ((matches / len1) + (matches / len2) + ((matches - transpositions) / matches)) / 3;

  let prefixLength = 0;
  const maxPrefix = Math.min(4, len1, len2);
  for (let i = 0; i < maxPrefix; i++) {
    if (str1[i] === str2[i]) prefixLength++;
    else break;
  }

  return jaro + (prefixLength * 0.1 * (1 - jaro));
}