'use client';

import type { SafetyDecision } from '@/types';

function decisionStyles(decision: SafetyDecision['decision']) {
  if (decision === 'block') return 'border-red-300 bg-red-50 text-red-950';
  if (decision === 'caution') return 'border-amber-300 bg-amber-50 text-amber-950';
  return 'border-emerald-300 bg-emerald-50 text-emerald-950';
}

function decisionLabel(decision: SafetyDecision['decision']) {
  if (decision === 'block') return 'Block';
  if (decision === 'caution') return 'Caution';
  return 'Allow';
}

export function SafetyDecisionPanel({ decision }: { decision: SafetyDecision }) {
  return (
    <section className={`rounded-2xl border p-4 shadow-sm ${decisionStyles(decision.decision)}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">Deterministic safety gate</p>
          <h3 className="mt-1 text-base font-semibold">Safety decision: {decisionLabel(decision.decision)}</h3>
        </div>
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium ring-1 ring-black/10">
          Safety-critical checks: deterministic/testable
        </span>
      </div>

      <p className="mt-3 text-sm leading-6"><strong>Reason:</strong> {decision.reason}</p>
      <p className="mt-2 text-sm leading-6"><strong>Safe next action:</strong> {decision.safeNextAction}</p>
      <p className="mt-2 rounded-xl bg-white/60 p-3 text-sm leading-6"><strong>Verification disclaimer:</strong> {decision.verificationDisclaimer}</p>

      <div className="mt-4">
        <h4 className="text-sm font-semibold">Triggered rules</h4>
        <ul className="mt-2 space-y-2">
          {decision.triggeredRules.map((rule, i) => (
            <li key={`${rule.ruleId}-${i}`} className="rounded-xl bg-white/60 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{rule.ruleId}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium ring-1 ring-black/10">
                  {rule.source === 'deterministic_rule' ? 'Deterministic safety-critical check' : 'AI suggestion (advisory, not authoritative)'}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium ring-1 ring-black/10">{rule.severity}</span>
              </div>
              <p className="mt-1 leading-6">{rule.message}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold">Safety checklist (synthetic/de-energized solar inverter demo)</h4>
        <ul className="mt-2 space-y-2">
          {decision.checklist.map((item) => (
            <li key={item.id} className="rounded-xl bg-white/60 p-3 text-sm">
              <div className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-0.5">{item.checked ? '✅' : '⚠️'}</span>
                <div>
                  <p className="font-medium">
                    {item.label}{' '}
                    {item.safetyCritical ? (
                      <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-900">Safety-critical</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-foreground/80">{item.guidance}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
