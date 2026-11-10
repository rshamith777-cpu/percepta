export type AnnotationType = 'bounding_box' | 'point' | 'arrow' | 'label' | 'inspection_region';
export type AnnotationSource = 'visual_ai_observation' | 'manual_supported_reference' | 'advisory';

export interface AnnotationBase {
  id: string;
  type: AnnotationType;
  label: string;
  explanation?: string;
  confidence?: number; // 0..1 when available
  source: AnnotationSource;
  safetyDisclaimer?: string;
}

/** Normalized coordinates (0..1) relative to the original image dimensions. */
export interface BoundingBoxAnnotation extends AnnotationBase {
  type: 'bounding_box' | 'inspection_region';
  x: number; // left
  y: number; // top
  width: number;
  height: number;
}

export interface PointAnnotation extends AnnotationBase {
  type: 'point' | 'label';
  x: number;
  y: number;
}

export interface ArrowAnnotation extends AnnotationBase {
  type: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type VisualAnnotation = BoundingBoxAnnotation | PointAnnotation | ArrowAnnotation;

export interface AnnotationSet {
  annotations: VisualAnnotation[];
  availability: 'available' | 'unavailable';
  explanation: string;
}
