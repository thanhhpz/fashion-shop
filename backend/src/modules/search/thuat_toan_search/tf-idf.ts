// src/modules/search/algorithms/tf-idf.ts

/**
 * TF-IDF (Term Frequency - Inverse Document Frequency)
 * 
 * Công dụng: Đo lường độ quan trọng của từ trong văn bản
 * Ứng dụng: Xếp hạng kết quả tìm kiếm, tìm từ khóa quan trọng
 * 
 * - TF (Term Frequency): Tần suất từ xuất hiện trong 1 document
 * - IDF (Inverse Document Frequency): Tần suất từ xuất hiện trong toàn bộ documents
 * - TF-IDF = TF * IDF
 * 
 * Từ càng xuất hiện nhiều trong 1 document 
 * và càng ít xuất hiện trong các document khác → càng quan trọng
 */

// src/modules/search/thuat_toan_search/tf-idf.ts

export class TFIDF {
  private documents: { id: number; content: string; tokens: string[] }[] = [];
  private idfCache: Map<string, number> = new Map();

  addDocument(id: number, content: string): void {
    const tokens = this.tokenize(content);
    this.documents.push({ id, content, tokens });
    this.idfCache.clear();
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 1);
  }

  private calculateIDF(term: string): number {
    if (this.idfCache.has(term)) {
      return this.idfCache.get(term)!;
    }

    const totalDocs = this.documents.length;
    let docsWithTerm = 0;
    for (const doc of this.documents) {
      if (doc.tokens.includes(term)) docsWithTerm++;
    }

    const idf = Math.log((totalDocs + 1) / (docsWithTerm + 1)) + 1;
    this.idfCache.set(term, idf);
    return idf;
  }

  search(query: string): { id: number; score: number; content: string }[] {
    const queryTokens = this.tokenize(query);
    const scores: Map<number, number> = new Map();

    for (const doc of this.documents) {
      let totalScore = 0;
      for (const token of queryTokens) {
        const tf = doc.tokens.filter(t => t === token).length / doc.tokens.length;
        const idf = this.calculateIDF(token);
        totalScore += tf * idf;
      }
      if (totalScore > 0) {
        scores.set(doc.id, totalScore);
      }
    }

    return Array.from(scores.entries())
      .map(([id, score]) => ({
        id,
        score,
        content: this.documents.find(d => d.id === id)?.content || '',
      }))
      .sort((a, b) => b.score - a.score);
  }
}