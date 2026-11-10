import type { DiagnosisResult, SafetyDecision } from '@/types';

function joinLines(lines: string[]): string {
  return lines.map((l) => l.trim()).filter(Boolean).join(' ');
}

export function buildDiagnosisSpeechText(input: {
  diagnosis: DiagnosisResult;
  safetyDecision: SafetyDecision | null;
  blockedEscalation: string | null;
}): { text: string; safetyIncluded: true } {
  const { diagnosis, safetyDecision, blockedEscalation } = input;

  // Never read unsafe blocked instructions as actionable guidance.
  // If guidance is blocked, read only the safe decision/escalation messaging.
  if (blockedEscalation || safetyDecision?.decision === 'block') {
    const safeLines = [
      'Repair guidance is blocked by the deterministic safety gate.',
      safetyDecision?.reason ? `Safety reason: ${safetyDecision.reason}` : '',
      safetyDecision?.safeNextAction ? `Safe next action: ${safetyDecision.safeNextAction}` : '',
      safetyDecision?.verificationDisclaimer ?? '',
      'Safety warnings remain in effect. Do not open energized electrical equipment or touch live components.',
    ];
    return { text: joinLines(safeLines), safetyIncluded: true };
  }

  const grounding = diagnosis.manualGrounding;
  const lines: string[] = [];
  lines.push(`Possible issue: ${diagnosis.possibleIssue}.`);
  lines.push(`Confidence level: ${diagnosis.confidenceLevel}. ${diagnosis.confidenceRationale}`);
  if (diagnosis.requiresExpertAssistance) {
    lines.push(`Expert assistance is required. ${diagnosis.expertAssistanceReason ?? ''}`);
  }
  lines.push(`Observed machine or component: ${diagnosis.observedMachineComponent}.`);

  if (grounding) {
    lines.push(`Manufacturer manual grounding status: ${grounding.manualGroundingStatus.replaceAll('_', ' ')}.`);
    lines.push(grounding.groundingDisclosure);
    if (grounding.manualSupportedClaims.length > 0) {
      lines.push('Claims supported by retrieved manufacturer manual passages:');
      for (const claim of grounding.manualSupportedClaims) {
        const citationText = claim.citations
          .map((c) => `${c.manualTitle}, page ${c.pageNumber}`)
          .join('; ');
        lines.push(`${claim.claim}${citationText ? `. Citation: ${citationText}.` : '.'}`);
      }
    } else {
      lines.push('No claims could be supported by retrieved manufacturer manual passages.');
    }
    if (grounding.aiSuggestionsNotSupportedByManual.length > 0) {
      lines.push('The following are advisory suggestions not supported by the manufacturer manual:');
      for (const s of grounding.aiSuggestionsNotSupportedByManual) lines.push(s);
    }
  }

  lines.push('Step by step inspection guidance for synthetic or confirmed de-energized equipment only:');
  for (const step of diagnosis.stepByStepInspectionGuidance) {
    lines.push(`Step ${step.order}: ${step.instruction}${step.caution ? `. Caution: ${step.caution}` : ''}`);
  }

  // Safety warnings must be included and remain prominent in voice output.
  lines.push('Safety warnings:');
  lines.push(diagnosis.demoEquipmentNotice);
  lines.push(diagnosis.imageLimitationsNotice);
  for (const w of diagnosis.safetyWarnings) lines.push(w);
  if (safetyDecision?.decision === 'caution') {
    lines.push(`Safety caution: ${safetyDecision.reason}. Safe next action: ${safetyDecision.safeNextAction}`);
  }

  return { text: joinLines(lines), safetyIncluded: true };
}
