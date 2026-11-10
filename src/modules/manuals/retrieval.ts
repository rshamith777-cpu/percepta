import type { RetrievedManualPassage, StoredManualChunk } from './types';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it',
  'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with', 'this', 'these', 'those',
  'or', 'if', 'then', 'into', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out',
  'over', 'under', 'again', 'further', 'can', 'could', 'should', 'would', 'may', 'might', 'please',
  'i', 'we', 'you', 'they', 'my', 'our', 'your', 'their', 'me', 'us', 'him', 'her', 'them',
  'what', 'when', 'where', 'why', 'how', 'show', 'shows', 'shown', 'error', 'issue', 'problem',
  'equipment', 'device', 'unit', 'solar', 'inverter', 'demo', 'deenergized', 'de-energized',
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9._/-]*/g) ?? [])
    .map((t) => t.replace(/^[_./-]+|[_./-]+$/g, ''))
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function uniqueTokens(text: string): Set<string> {
  return new Set(tokenize(text));
}

export interface RetrievalOptions {
  topK?: number;
  minScore?: number;
  minTokenMatches?: number;
}

export function retrieveRelevantPassages(
  chunks: StoredManualChunk[],
  query: { problemDescription: string; machineComponent?: string },
  options: RetrievalOptions = {},
): RetrievedManualPassage[] {
  const topK = options.topK ?? 5;
  const minScore = options.minScore ?? 1.8;
  const minTokenMatches = options.minTokenMatches ?? 1;
  const queryText = [query.problemDescription, query.machineComponent].filter(Boolean).join(' ');
  const queryTokens = uniqueTokens(queryText);
  if (queryTokens.size === 0 || chunks.length === 0) return [];

  const scored: RetrievedManualPassage[] = [];
  for (const chunk of chunks) {
    const haystackLower = chunk.text.toLowerCase();
    const chunkTokens = uniqueTokens(chunk.text);
    let matches = 0;
    let score = 0;
    for (const token of queryTokens) {
      if (chunkTokens.has(token)) {
        matches += 1;
        score += token.length >= 5 ? 1.25 : 1;
      } else if (token.length >= 4 && haystackLower.includes(token)) {
        matches += 1;
        score += 0.6;
      }
    }
    // Small phrase bonus only when there is at least one direct token match.
    if (matches > 0) {
      const phrases = query.problemDescription
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((p) => p.length >= 6)
        .slice(0, 12);
      for (const phrase of phrases) {
        if (haystackLower.includes(phrase)) score += 0.25;
      }
    }
    if (matches < minTokenMatches || score < minScore || (matches < 2 && score < 2.6)) continue;
    scored.push({
      manualId: chunk.manualId,
      manualTitle: chunk.manualTitle,
      pageNumber: chunk.pageNumber,
      chunkId: chunk.id,
      passage: chunk.text,
      score: Number(score.toFixed(3)),
    });
  }

  scored.sort((a, b) => b.score - a.score || a.pageNumber - b.pageNumber);
  return scored.slice(0, topK);
}

export function formatRetrievedPassagesForPrompt(passages: RetrievedManualPassage[]): string {
  if (passages.length === 0) return 'No relevant manual content found.';
  return passages
    .map(
      (p, i) =>
        `[PASSAGE ${i + 1}]\nManual: ${p.manualTitle}\nPage: ${p.pageNumber}\nPassage: ${p.passage}`,
    )
    .join('\n\n');
}
