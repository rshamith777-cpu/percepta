'use client';

import type { DiagnosisResult } from '@/types/diagnosis';
import type { SafetyDecision, SupportedLanguage } from '@/types';
import { VoiceOutputControls } from './VoiceOutputControls';
import { ImageAnnotationViewer } from '@/components/annotations/ImageAnnotationViewer';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground/65">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-foreground">{children}</div>
    </section>
  );
}

function confidenceClass(level: DiagnosisResult['confidenceLevel']) {
  if (level === 'high') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (level === 'medium') return 'bg-amber-50 text-amber-900 ring-amber-200';
  return 'bg-red-50 text-red-900 ring-red-200';
}

export function DiagnosisResultView({
  diagnosis,
  model,
  language = 'en',
  safetyDecision = null,
  imageUrl = null,
}: {
  diagnosis: DiagnosisResult;
  model?: string;
  language?: SupportedLanguage;
  safetyDecision?: SafetyDecision | null;
  imageUrl?: string | null;
}) {
  const grounding = diagnosis.manualGrounding;

  return (
    <div className="space-y-4" aria-live="polite">
      <VoiceOutputControls language={language} diagnosis={diagnosis} safetyDecision={safetyDecision} blockedEscalation={null} />

      <section className="rounded-2xl border border-red-200 bg-danger-surface p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-danger">Safety notices (required)</h3>
        <p className="mt-2 text-sm leading-6 text-red-950">{diagnosis.demoEquipmentNotice}</p>
        <p className="mt-2 text-sm leading-6 text-red-950">{diagnosis.imageLimitationsNotice}</p>
      </section>

      {grounding ? (
        <section className={`rounded-2xl border p-4 shadow-sm ${grounding.manualGroundingStatus === 'grounded' ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/60'}`}>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground/70">Manufacturer manual grounding</h3>
          <p className="mt-2 text-sm leading-6">
            <strong>Status:</strong>{' '}
            {grounding.manualGroundingStatus === 'grounded'
              ? 'Grounded — claims below are supported by validated citations to retrieved manual passages'
              : grounding.manualGroundingStatus === 'no_manuals'
                ? 'No grounding-eligible manuals available'
                : 'Not grounded — no claims were supported by validated citations to retrieved manual passages'}
          </p>
          <p className="mt-1 text-xs text-foreground/70">
            Candidate passage retrieval (if any) is shown separately in the diagnosis workflow; grounding requires validated citations (correct manual title and page) to exact retrieved passages.
          </p>
          <p className="mt-2 text-sm leading-6">{grounding.groundingDisclosure}</p>
        </section>
      ) : null}

      <ImageAnnotationViewer imageUrl={imageUrl} annotationSet={diagnosis.annotationSet} />

      <Section title="Observed machine / component">
        <p>{diagnosis.observedMachineComponent}</p>
      </Section>

      <Section title="Possible issue">
        <p>{diagnosis.possibleIssue}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${confidenceClass(diagnosis.confidenceLevel)}`}>
            Confidence: {diagnosis.confidenceLevel}
          </span>
          {diagnosis.requiresExpertAssistance ? (
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-900 ring-1 ring-red-200">
              Expert assistance required
            </span>
          ) : (
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground/80 ring-1 ring-border">
              Expert assistance: assess before action
            </span>
          )}
          {model ? <span className="text-xs text-foreground/55">Model: {model}</span> : null}
        </div>
        <p className="mt-2 text-foreground/75">{diagnosis.confidenceRationale}</p>
        {diagnosis.expertAssistanceReason ? (
          <p className="mt-2 rounded-xl bg-red-50 p-3 text-red-950">{diagnosis.expertAssistanceReason}</p>
        ) : null}
      </Section>

      <Section title="Visual observations from uploaded image (advisory)">
        <ul className="list-disc space-y-1 pl-5">
          {(grounding?.visualObservationsFromImage?.length ? grounding.visualObservationsFromImage : diagnosis.supportingVisualObservations).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Section>

      {grounding ? (
        <Section title="Claims supported by retrieved manufacturer-manual passages">
          {grounding.manualSupportedClaims.length > 0 ? (
            <ul className="space-y-4">
              {grounding.manualSupportedClaims.map((claim, i) => (
                <li key={i} className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                  <p className="font-medium text-emerald-950">{claim.claim}</p>
                  <div className="mt-2 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Page-specific citations</p>
                    {claim.citations.map((c, j) => (
                      <blockquote key={j} className="rounded-lg border border-emerald-100 bg-white/80 p-3 text-sm">
                        <p><strong>Manual:</strong> {c.manualTitle}</p>
                        <p><strong>Page:</strong> {c.pageNumber}</p>
                        <p className="mt-1"><strong>Supporting passage:</strong></p>
                        <p className="mt-1 whitespace-pre-wrap text-foreground/85">{c.supportingPassage}</p>
                      </blockquote>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
              No claims could be supported by retrieved manufacturer-manual passages. Do not treat AI suggestions below as manufacturer instructions.
            </p>
          )}
        </Section>
      ) : null}

      {grounding ? (
        <Section title="AI suggestions not supported by the manual (advisory only)">
          {grounding.aiSuggestionsNotSupportedByManual.length > 0 ? (
            <ul className="space-y-2">
              {grounding.aiSuggestionsNotSupportedByManual.map((item, i) => (
                <li key={i} className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-amber-950">
                  <span className="mr-2 rounded bg-amber-200 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">Not manufacturer-supported</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-foreground/70">No additional unsupported AI suggestions were listed.</p>
          )}
        </Section>
      ) : null}

      <Section title="Supporting visual observations (legacy field)">
        <ul className="list-disc space-y-1 pl-5">
          {diagnosis.supportingVisualObservations.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section title="Uncertain observations (clearly labeled)">
        {diagnosis.uncertainObservations.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5">
            {diagnosis.uncertainObservations.map((item, i) => (
              <li key={i}>
                <span className="mr-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
                  Uncertain
                </span>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-foreground/70">No additional uncertainties were explicitly listed by the model. Treat all visual observations as advisory.</p>
        )}
      </Section>

      <Section title="Step-by-step inspection guidance (safe, de-energized demo)">
        <ol className="space-y-3 pl-5">
          {diagnosis.stepByStepInspectionGuidance.map((step) => (
            <li key={`${step.order}-${step.instruction}`} className="list-decimal">
              <p>{step.instruction}</p>
              {step.caution ? <p className="mt-1 rounded-lg bg-amber-50 p-2 text-amber-950"><strong>Caution:</strong> {step.caution}</p> : null}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Required tools or PPE">
        <ul className="list-disc space-y-1 pl-5">
          {diagnosis.requiredToolsOrPpe.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section title="Safety warnings">
        <ul className="space-y-2">
          {diagnosis.safetyWarnings.map((item, i) => (
            <li key={i} className="rounded-xl border border-red-100 bg-red-50/70 p-3 text-red-950">
              {item}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
