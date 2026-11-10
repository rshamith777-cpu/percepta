import { createDefaultSafetyChecklist, mergeChecklist } from './checklist';
import type {
  EquipmentStatusInput,
  SafetyDecision,
  SafetyGateInput,
  TriggeredRule,
} from './types';

export const SAFETY_VERIFICATION_DISCLAIMER =
  'A camera image or AI model cannot verify whether solar inverter equipment is electrically de-energized. ' +
  'Use qualified lockout/tagout, testing, and site safety procedures performed by authorized personnel. ' +
  'This prototype is not certified and is not safe for real electrical maintenance.';

const SAFE_ESCALATION_NEXT_ACTION =
  'Stop repair guidance. Keep people clear of the equipment if there is any sign of electrical risk. ' +
  'Do not open energized equipment, do not touch live components, and do not bypass protective devices. ' +
  'Escalate to a qualified electrician or inverter technician and follow manufacturer/site lockout-tagout and safety procedures.';

const LIVE_OR_UNCERTAIN_PATTERNS: Array<{ ruleId: string; re: RegExp; message: string }> = [
  {
    ruleId: 'input_live_voltage_present',
    re: /\b(live|(?<!de-?)(?<!non-?)(?<!un-?)energized|powered on|still on|power on|voltage present|current flowing|sparking|arcing|arc flash)\b/i,
    message: 'The description indicates equipment may be live, energized, or electrically hazardous.',
  },
  {
    ruleId: 'input_status_uncertain',
    re: /\b(not sure|unsure|unknown|maybe live|might be live|possibly energized|cannot confirm|can't confirm|don'?t know if.*de-?energized)\b/i,
    message: 'Equipment electrical status is uncertain.',
  },
  {
    ruleId: 'input_dangerous_symptom',
    re: /\b(burning smell|smoke|fire|melted|exposed wire|exposed conductor|water ingress|wet|shock|tingling)\b/i,
    message: 'The description includes symptoms that may indicate dangerous electrical conditions.',
  },
];

function hasNegatedSafetyPhrase(text: string): boolean {
  return /\b(do\s+not|don'?t|never|avoid|must\s+not|should\s+not|cannot|can't|without)\b/i.test(text);
}

const UNSAFE_AI_GUIDANCE_PATTERNS: Array<{
  ruleId: string;
  re: RegExp;
  message: string;
  allowNegatedMatch?: boolean;
}> = [
  {
    ruleId: 'ai_unsafe_open_energized',
    re: /\b(open|remove\s+(?:the\s+)?cover|open\s+(?:the\s+)?panel|access\s+terminals?)\b[^.\n]{0,80}\b(energized|live|powered|while\s+on|with\s+power)\b|\b(energized|live|powered)\b[^.\n]{0,80}\b(open|remove\s+(?:the\s+)?cover|open\s+(?:the\s+)?panel)\b/i,
    message: 'AI output suggests opening energized/live equipment.',
  },
  {
    ruleId: 'ai_unsafe_touch_live',
    re: /\b(touch|handle|probe|make\s+contact\s+with)\b[^.\n]{0,60}\b(live|energized|exposed\s+conductor)\b|\b(live|energized)\b[^.\n]{0,60}\b(touch|handle|probe)\b/i,
    message: 'AI output suggests touching live or energized components.',
  },
  {
    ruleId: 'ai_unsafe_bypass_protection',
    re: /\b(bypass|jumper(?:\s+out)?|defeat|disable)\b[^.\n]{0,80}\b(interlock|breaker|fuse|protective\s+device|protection|safety\s+device|ground\s*fault)\b/i,
    message: 'AI output suggests bypassing protective devices or safety interlocks.',
  },
  {
    ruleId: 'ai_unsafe_dangerous_work',
    re: /\b(work\s+on\s+live|repair\s+while\s+energized|operate\s+with\s+cover\s+removed\s+and\s+powered|test\s+live\s+terminals?)\b/i,
    message: 'AI output suggests dangerous electrical work.',
  },
  {
    ruleId: 'ai_false_verification_claim',
    re: /\b(camera|image|ai|model|photo)\b[^.\n]{0,80}\b(can|confirms?|verif(?:y|ies)|proves?|determines?)\b[^.\n]{0,80}\b(de-?energized|safe|no\s+voltage|not\s+live|electrically\s+safe)\b/i,
    message: 'AI output incorrectly claims camera/image/AI can verify de-energized or electrically safe status.',
    allowNegatedMatch: true,
  },
];

function normalizeText(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function evaluateInputSafety(input: {
  problemDescription: string;
  equipmentStatus: EquipmentStatusInput;
  checklist?: SafetyGateInput['checklist'];
}): SafetyDecision {
  const checklist = mergeChecklist(createDefaultSafetyChecklist(input.equipmentStatus), input.checklist);
  const triggeredRules: TriggeredRule[] = [];
  const description = normalizeText(input.problemDescription);

  if (input.equipmentStatus === 'potentially_live') {
    triggeredRules.push({
      ruleId: 'equipment_status_potentially_live',
      source: 'deterministic_rule',
      severity: 'critical',
      message: 'Equipment status is reported as potentially live.',
    });
  }
  if (input.equipmentStatus === 'uncertain') {
    triggeredRules.push({
      ruleId: 'equipment_status_uncertain',
      source: 'deterministic_rule',
      severity: 'critical',
      message: 'Equipment status is uncertain; de-energized state cannot be assumed.',
    });
  }

  for (const pattern of LIVE_OR_UNCERTAIN_PATTERNS) {
    if (pattern.re.test(description)) {
      // Avoid false positives on explicit safety-policy negations (e.g. "no live work",
      // "confirmed de-energized, no live electrical work"). Never suppress genuine hazards:
      // if any non-negatable hazard alternative matches, or any live/energized instance is
      // NOT in a negated safety-policy context, keep the rule triggered.
      if (pattern.ruleId === 'input_live_voltage_present') {
        const otherHazard = /\b(powered on|still on|power on|voltage present|current flowing|sparking|arcing|arc flash)\b/i.test(description);
        if (!otherHazard) {
          const wordRe = /\b(live|energized)\b/gi;
          let w: RegExpExecArray | null;
          let anyWord = false;
          let allNegatedPolicy = true;
          while ((w = wordRe.exec(description)) !== null) {
            const matched = w[0].toLowerCase();
            // "de-energized/non-energized/un-energized" forms are safe context; the main
            // alternation already excludes them, but be defensive.
            const prefixStart = Math.max(0, w.index - 4);
            const prefix = description.slice(prefixStart, w.index).toLowerCase();
            if (matched === 'energized' && /(?:de-?|non-?|un-?)$/.test(prefix)) continue;
            anyWord = true;
            const before = description.slice(Math.max(0, w.index - 40), w.index).toLowerCase();
            const after = description.slice(w.index, Math.min(description.length, w.index + 60));
            const simpleStatusNegation = matched === 'energized' && /\b(not|never)\b[^.]{0,12}$/.test(before);
            const near = `${before} ${matched} ${after}`.toLowerCase();
            const negatedPolicy = simpleStatusNegation || (
              /\b(no|not|never|without|avoid|do\s+not|don'?t)\b[^.]{0,30}$/.test(before)
              && /\b(work|working|electrical|access|touch|touching|open|opening|repair|testing|procedure|demo|inspection|equipment|components?|circuits?|parts?|servic(e|ing)|maintain|maintenance)\b/i.test(near)
            );
            if (!negatedPolicy) { allNegatedPolicy = false; break; }
          }
          if (anyWord && allNegatedPolicy) continue;
        }
        // else: other strong hazard terms present or a non-negated live/energized instance -> keep triggered
      }
      triggeredRules.push({
        ruleId: pattern.ruleId,
        source: 'deterministic_rule',
        severity: pattern.ruleId === 'input_dangerous_symptom' ? 'critical' : 'critical',
        message: pattern.message,
      });
    }
  }

  const failedCriticalChecklist = checklist.filter((item) => item.safetyCritical && !item.checked);
  for (const item of failedCriticalChecklist) {
    triggeredRules.push({
      ruleId: `checklist_${item.id}`,
      source: 'deterministic_rule',
      severity: 'critical',
      message: `Safety-critical checklist item not satisfied: ${item.label}.`,
    });
  }

  const failedAdvisoryChecklist = checklist.filter((item) => !item.safetyCritical && !item.checked);
  for (const item of failedAdvisoryChecklist) {
    triggeredRules.push({
      ruleId: `checklist_${item.id}`,
      source: 'deterministic_rule',
      severity: 'caution',
      message: `Advisory checklist item not confirmed: ${item.label}.`,
    });
  }

  const hasCritical = triggeredRules.some((r) => r.severity === 'critical');
  if (hasCritical) {
    return {
      decision: 'block',
      reason:
        'Deterministic safety gate blocked repair guidance because equipment status is live/uncertain, dangerous symptoms were indicated, or required demo safety checks were not satisfied.',
      triggeredRules,
      safeNextAction: SAFE_ESCALATION_NEXT_ACTION,
      checklist,
      safetyCritical: true,
      verificationDisclaimer: SAFETY_VERIFICATION_DISCLAIMER,
    };
  }

  triggeredRules.push({
    ruleId: 'demo_synthetic_or_deenergized_context',
    source: 'deterministic_rule',
    severity: 'info',
    message: 'Deterministic checks passed for synthetic or confirmed de-energized demo context. AI guidance, if used, remains advisory.',
  });

  const hasCaution = triggeredRules.some((r) => r.severity === 'caution');
  return {
    decision: hasCaution ? 'caution' : 'allow',
    reason: hasCaution
      ? 'Deterministic safety checks passed required safety-critical items, but advisory checklist items need attention. Proceed with caution on synthetic/de-energized demo equipment only.'
      : 'Deterministic safety checks passed for synthetic or confirmed de-energized demo equipment with required checklist items satisfied.',
    triggeredRules,
    safeNextAction:
      'Proceed only with external visual inspection and documentation on synthetic or confirmed de-energized equipment. ' +
      'Escalate to qualified personnel for any internal access, uncertainty, damage, or electrical risk. ' +
      'A camera or AI model cannot verify de-energized status.',
    checklist,
    safetyCritical: true,
    verificationDisclaimer: SAFETY_VERIFICATION_DISCLAIMER,
  };
}

export function evaluateAiOutputSafety(aiGeneratedText: string, checklist: SafetyDecision['checklist']): SafetyDecision {
  const text = normalizeText(aiGeneratedText);
  const triggeredRules: TriggeredRule[] = [];

  for (const pattern of UNSAFE_AI_GUIDANCE_PATTERNS) {
    const match = text.match(pattern.re);
    if (!match) continue;
    const window = text.slice(Math.max(0, (match.index ?? 0) - 40), (match.index ?? 0) + match[0].length + 20);
    if (!pattern.allowNegatedMatch && hasNegatedSafetyPhrase(window)) continue;
    if (pattern.allowNegatedMatch && /\b(cannot|can't|unable to|not able to|never|does not|doesn't)\b/i.test(window)) continue;
    triggeredRules.push({
      ruleId: pattern.ruleId,
      source: 'deterministic_rule',
      severity: 'critical',
      message: pattern.message,
    });
  }

  if (triggeredRules.length > 0) {
    return {
      decision: 'block',
      reason:
        'Deterministic safety gate blocked AI-generated guidance because it contained unsafe or misleading electrical safety instructions.',
      triggeredRules,
      safeNextAction: SAFE_ESCALATION_NEXT_ACTION,
      checklist,
      safetyCritical: true,
      verificationDisclaimer: SAFETY_VERIFICATION_DISCLAIMER,
    };
  }

  triggeredRules.push({
    ruleId: 'ai_output_postcheck_passed',
    source: 'deterministic_rule',
    severity: 'info',
    message: 'AI output passed deterministic unsafe-guidance pattern checks. AI suggestions remain advisory and require human/qualified review.',
  });
  return {
    decision: 'allow',
    reason:
      'AI output passed deterministic safety pattern checks. Guidance remains advisory and cannot verify electrical de-energization.',
    triggeredRules,
    safeNextAction:
      'Use guidance only for safe visual inspection on synthetic or confirmed de-energized demo equipment. Escalate dangerous or unclear work.',
    checklist,
    safetyCritical: true,
    verificationDisclaimer: SAFETY_VERIFICATION_DISCLAIMER,
  };
}

export function evaluateSafetyGate(input: SafetyGateInput): SafetyDecision {
  const pre = evaluateInputSafety({
    problemDescription: input.problemDescription,
    equipmentStatus: input.equipmentStatus,
    checklist: input.checklist,
  });
  if (pre.decision === 'block') return pre;
  if (input.aiGeneratedText) {
    const post = evaluateAiOutputSafety(input.aiGeneratedText, pre.checklist);
    if (post.decision === 'block') return post;
    return {
      ...post,
      triggeredRules: [...pre.triggeredRules, ...post.triggeredRules.filter((r) => r.ruleId !== 'ai_output_postcheck_passed')].concat(
        post.triggeredRules.filter((r) => r.ruleId === 'ai_output_postcheck_passed'),
      ),
      decision: pre.decision === 'caution' || post.decision === 'caution' ? 'caution' : 'allow',
      reason:
        pre.decision === 'caution' || post.decision === 'caution'
          ? 'Deterministic checks allow limited advisory guidance with caution for synthetic/de-energized demo context.'
          : 'Deterministic pre- and post-checks passed; guidance remains advisory and not certified for real electrical maintenance.',
      safeNextAction: post.safeNextAction,
    };
  }
  return pre;
}

export function buildBlockedEscalation(decision: SafetyDecision): string {
  const rules = decision.triggeredRules.map((r) => `- [${r.ruleId}] ${r.message}`).join('\n');
  return [
    'Repair guidance was blocked by the deterministic safety gate.',
    '',
    decision.reason,
    '',
    'Triggered rules:',
    rules || '- (none)',
    '',
    `Safe next action: ${decision.safeNextAction}`,
    '',
    decision.verificationDisclaimer,
  ].join('\n');
}
