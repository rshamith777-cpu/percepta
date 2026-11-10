import { describe, expect, it } from 'vitest';
import { computeObjectContainRect, normalizeAnnotationSet, validateAnnotation } from './index';

describe('annotation coordinate validation (Phase 4)', () => {
  it('accepts valid normalized bounding boxes and preserves source attribution', () => {
    const ann = validateAnnotation(
      {
        id: 'box-1',
        type: 'bounding_box',
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.2,
        label: 'Possible display area',
        explanation: 'Advisory visual highlight only.',
        confidence: 0.6,
        source: 'visual_ai_observation',
      },
      0,
    );
    expect(ann).toMatchObject({
      id: 'box-1',
      type: 'bounding_box',
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.2,
      source: 'visual_ai_observation',
      label: 'Possible display area',
    });
    expect(ann?.confidence).toBe(0.6);
    expect(ann?.safetyDisclaimer).toMatch(/Advisory/i);
  });

  it('rejects invalid or out-of-range coordinates', () => {
    expect(validateAnnotation({ type: 'point', label: 'x', x: -0.1, y: 0.2 }, 0)).toBeNull();
    expect(validateAnnotation({ type: 'point', label: 'x', x: 1.2, y: 0.2 }, 0)).toBeNull();
    expect(validateAnnotation({ type: 'bounding_box', label: 'x', x: 0.1, y: 0.1, width: 0, height: 0.2 }, 0)).toBeNull();
    expect(validateAnnotation({ type: 'arrow', label: 'x', x1: 0.1, y1: 0.1, x2: 0.2, y2: NaN }, 0)).toBeNull();
  });

  it('rejects unsafe or false-safety annotation text', () => {
    expect(validateAnnotation({ type: 'point', label: 'Safe to touch here', x: 0.2, y: 0.2 }, 0)).toBeNull();
    expect(validateAnnotation({ type: 'label', label: 'Open the panel', x: 0.2, y: 0.2 }, 0)).toBeNull();
  });
});

describe('annotation set normalization', () => {
  it('suppresses actionable/advisory annotations when diagnosis is blocked', () => {
    const set = normalizeAnnotationSet({
      annotations: [{ type: 'point', label: 'Area to visually inspect', x: 0.2, y: 0.2, source: 'advisory' }],
      diagnosisBlocked: true,
    });
    expect(set.annotations).toEqual([]);
    expect(set.availability).toBe('unavailable');
    expect(set.explanation).toMatch(/blocked/i);
  });

  it('returns unavailable with explanation when no valid annotations exist (never fabricated)', () => {
    const set = normalizeAnnotationSet({
      annotations: [{ type: 'point', label: 'bad', x: 5, y: 5 }],
      annotationExplanation: '',
    });
    expect(set.annotations).toEqual([]);
    expect(set.availability).toBe('unavailable');
    expect(set.explanation).toMatch(/No reliable image-grounded/i);
  });

  it('keeps valid annotations and explanation when available', () => {
    const set = normalizeAnnotationSet({
      annotations: [
        { type: 'point', label: 'Possible indicator LED', x: 0.4, y: 0.3, source: 'visual_ai_observation' },
        { type: 'inspection_region', label: 'Area to visually inspect', x: 0.2, y: 0.2, width: 0.3, height: 0.3, source: 'advisory' },
      ],
      annotationAvailability: 'available',
      annotationExplanation: 'Advisory highlights; approximate.',
    });
    expect(set.availability).toBe('available');
    expect(set.annotations).toHaveLength(2);
    expect(set.annotations[0].source).toBe('visual_ai_observation');
    expect(set.annotations[1].source).toBe('advisory');
  });
});

describe('image overlay resize/alignment logic', () => {
  it('computes centered object-contain rect', () => {
    const rect = computeObjectContainRect(200, 100, 100, 100); // square image in wide container
    expect(rect.width).toBeCloseTo(100);
    expect(rect.height).toBeCloseTo(100);
    expect(rect.x).toBeCloseTo(50);
    expect(rect.y).toBeCloseTo(0);
  });

  it('fits tall images within container', () => {
    const rect = computeObjectContainRect(100, 200, 100, 400);
    expect(rect.width).toBeCloseTo(50);
    expect(rect.height).toBeCloseTo(200);
    expect(rect.x).toBeCloseTo(25);
    expect(rect.y).toBeCloseTo(0);
  });
});
