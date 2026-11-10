import type { ExtractedPageText, StoredManualChunk } from './types';

export interface ChunkOptions {
  maxChars?: number;
  overlapChars?: number;
  minChunkChars?: number;
}

function splitLongText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const parts: string[] = [];
  const paragraphs = text.split(/\n{2,}/);
  let current = '';
  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) parts.push(current);
    if (para.length <= maxChars) {
      current = para;
    } else {
      // Hard split oversized paragraph on sentence-ish boundaries.
      let remaining = para;
      while (remaining.length > maxChars) {
        let cut = remaining.lastIndexOf('. ', maxChars);
        if (cut < Math.floor(maxChars * 0.5)) cut = remaining.lastIndexOf(' ', maxChars);
        if (cut < Math.floor(maxChars * 0.4)) cut = maxChars;
        parts.push(remaining.slice(0, cut + 1).trim());
        remaining = remaining.slice(cut + 1).trim();
      }
      current = remaining;
    }
  }
  if (current) parts.push(current);
  return parts.filter(Boolean);
}

export function chunkExtractedPages(
  pages: ExtractedPageText[],
  meta: { manualId: string; manualTitle: string },
  options: ChunkOptions = {},
): StoredManualChunk[] {
  const maxChars = options.maxChars ?? 1200;
  const overlapChars = Math.max(0, Math.min(options.overlapChars ?? 120, Math.floor(maxChars / 3)));
  const minChunkChars = options.minChunkChars ?? 40;
  const chunks: StoredManualChunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue;
    const parts = splitLongText(text, maxChars);
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i].trim();
      if (i > 0 && overlapChars > 0) {
        const prev = parts[i - 1];
        const tail = prev.slice(Math.max(0, prev.length - overlapChars)).trim();
        if (tail && !part.startsWith(tail)) part = `${tail}\n${part}`;
      }
      if (part.length < minChunkChars && chunks.length > 0 && chunks[chunks.length - 1].pageNumber === page.pageNumber) {
        chunks[chunks.length - 1].text = `${chunks[chunks.length - 1].text}\n${part}`.slice(0, maxChars + overlapChars);
        continue;
      }
      if (part.length < minChunkChars) continue;
      chunkIndex += 1;
      chunks.push({
        id: `${meta.manualId}:p${page.pageNumber}:c${chunkIndex}`,
        manualId: meta.manualId,
        manualTitle: meta.manualTitle,
        pageNumber: page.pageNumber,
        chunkIndex,
        text: part,
      });
    }
  }

  return chunks;
}
