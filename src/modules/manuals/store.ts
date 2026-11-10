import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ManualDocument, StoredManualChunk } from './types';
import { assessManualRelevance } from './relevance';

const DATA_DIR = path.join(process.cwd(), 'data', 'manuals');
const INDEX_PATH = path.join(DATA_DIR, 'index.json');
const CHUNKS_DIR = path.join(DATA_DIR, 'chunks');

async function ensureDirs(): Promise<void> {
  await fs.mkdir(CHUNKS_DIR, { recursive: true });
}

async function readChunkFileRaw(manualId: string): Promise<StoredManualChunk[]> {
  try {
    const raw = await fs.readFile(path.join(CHUNKS_DIR, `${manualId}.json`), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredManualChunk[]) : [];
  } catch {
    return [];
  }
}

function hasRelevanceMetadata(doc: ManualDocument): boolean {
  return (
    typeof doc.groundingEligible === 'boolean' ||
    typeof doc.relevanceReason === 'string' ||
    typeof doc.relevanceCategory === 'string'
  );
}

export function migrateLegacyDoc(doc: ManualDocument, chunks: StoredManualChunk[]): ManualDocument {
  if (hasRelevanceMetadata(doc)) return doc;
  const text = chunks.map((c) => c.text).join('\n').slice(0, 120000);
  if (!text.trim()) {
    return {
      ...doc,
      status: 'irrelevant',
      groundingEligible: false,
      relevanceCategory: 'unverified_legacy',
      relevanceReason:
        'Legacy uploaded manual has no relevance metadata and no readable stored text could be assessed. Failing closed for grounding: not suitable for manufacturer/manual grounding until re-uploaded and re-assessed.',
      error: undefined,
    };
  }
  const assessment = assessManualRelevance({ title: doc.title || doc.filename, extractedText: text });
  if (assessment.suitableForGrounding) {
    return {
      ...doc,
      status: 'ready',
      groundingEligible: true,
      relevanceCategory: assessment.category,
      relevanceReason: `Re-assessed from stored extracted text (legacy record migration): ${assessment.reason}`,
      error: undefined,
    };
  }
  return {
    ...doc,
    status: 'irrelevant',
    groundingEligible: false,
    relevanceCategory: assessment.category === 'insufficient_text' ? 'unverified_legacy' : assessment.category,
    relevanceReason: `Re-assessed from stored extracted text (legacy record migration): ${assessment.reason}`,
    error: assessment.reason,
  };
}

async function readIndex(): Promise<ManualDocument[]> {
  try {
    const raw = await fs.readFile(INDEX_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const docs = Array.isArray(parsed) ? (parsed as ManualDocument[]) : [];
    let changed = false;
    const migrated: ManualDocument[] = [];
    for (const doc of docs) {
      if (hasRelevanceMetadata(doc)) {
        migrated.push(doc);
        continue;
      }
      const chunks = await readChunkFileRaw(doc.id);
      const next = migrateLegacyDoc(doc, chunks);
      migrated.push(next);
      changed = true;
    }
    if (changed) {
      try {
        await writeIndexRaw(migrated);
      } catch {
        // best-effort persistence; still return migrated view
      }
    }
    return migrated;
  } catch {
    return [];
  }
}

async function writeIndexRaw(docs: ManualDocument[]): Promise<void> {
  await ensureDirs();
  await fs.writeFile(INDEX_PATH, JSON.stringify(docs, null, 2), 'utf8');
}

async function writeIndex(docs: ManualDocument[]): Promise<void> {
  await writeIndexRaw(docs);
}

function isGroundingEligible(doc: ManualDocument): boolean {
  // Fail closed: only explicitly eligible, ready docs may ground diagnosis.
  return doc.groundingEligible === true && doc.status === 'ready';
}

export async function listManualDocuments(): Promise<ManualDocument[]> {
  const docs = await readIndex();
  return docs.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function getManualDocument(id: string): Promise<ManualDocument | null> {
  const docs = await readIndex();
  return docs.find((d) => d.id === id) ?? null;
}

export async function getManualChunks(manualId: string): Promise<StoredManualChunk[]> {
  const doc = await getManualDocument(manualId);
  if (doc && !isGroundingEligible(doc)) return [];
  return readChunkFileRaw(manualId);
}

export async function getAllManualChunks(): Promise<StoredManualChunk[]> {
  const docs = await readIndex();
  const eligible = docs.filter(isGroundingEligible);
  const all = await Promise.all(eligible.map((d) => readChunkFileRaw(d.id)));
  return all.flat();
}

export async function listGroundingEligibleManualDocuments(): Promise<ManualDocument[]> {
  const docs = await readIndex();
  return docs.filter(isGroundingEligible).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function saveManual(
  doc: Omit<ManualDocument, 'id' | 'uploadedAt' | 'chunkCount'> & { chunkCount?: number },
  chunks: StoredManualChunk[],
): Promise<ManualDocument> {
  await ensureDirs();
  const id = randomUUID();
  const saved: ManualDocument = {
    ...doc,
    id,
    uploadedAt: new Date().toISOString(),
    chunkCount: doc.chunkCount ?? chunks.length,
    // Fail closed by default unless explicitly eligible.
    groundingEligible: doc.groundingEligible === true,
  };
  const chunksWithId = chunks.map((c) => ({ ...c, manualId: id, id: c.id.replace(/^manual-temp/, id) }));
  const docs = await readIndex();
  docs.push(saved);
  await writeIndex(docs);
  await fs.writeFile(path.join(CHUNKS_DIR, `${id}.json`), JSON.stringify(chunksWithId, null, 2), 'utf8');
  return saved;
}

export async function deleteManual(manualId: string): Promise<boolean> {
  if (!manualId || manualId.includes('/') || manualId.includes('\\') || manualId.includes('..')) return false;
  const docs = await readIndex();
  const next = docs.filter((d) => d.id !== manualId);
  if (next.length === docs.length) return false;
  await writeIndex(next);
  try {
    await fs.unlink(path.join(CHUNKS_DIR, `${manualId}.json`));
  } catch {
    // ignore missing chunk file
  }
  return true;
}

export function sanitizeManualTitle(title: string, fallbackFilename: string): string {
  const base = title.trim() || fallbackFilename.replace(/\.pdf$/i, '').trim() || 'Uploaded Manual';
  return base.slice(0, 180);
}

export { isGroundingEligible };
