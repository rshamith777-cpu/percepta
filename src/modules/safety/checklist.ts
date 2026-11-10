import type { EquipmentStatusInput, SafetyChecklistItem } from './types';

export function createDefaultSafetyChecklist(equipmentStatus: EquipmentStatusInput): SafetyChecklistItem[] {
  const demoContextOk = equipmentStatus === 'synthetic_demo' || equipmentStatus === 'de_energized_confirmed';
  return [
    {
      id: 'demo_scope_synthetic_or_deenergized',
      label: 'Equipment is synthetic demo hardware or confirmed de-energized for training/demo',
      safetyCritical: true,
      checked: demoContextOk,
      guidance:
        'This prototype supports synthetic or de-energized solar inverter demos only. Do not use it for live troubleshooting.',
    },
    {
      id: 'no_live_work',
      label: 'No live electrical work, no opening energized equipment, no touching live components',
      safetyCritical: true,
      checked: demoContextOk,
      guidance:
        'Never open energized equipment, touch live components, bypass protective devices, or perform dangerous electrical work.',
    },
    {
      id: 'qualified_escalation',
      label: 'Qualified electrician/inverter technician escalation path is available',
      safetyCritical: true,
      checked: true,
      guidance:
        'If status is unclear, damage is present, or electrical risk is possible, stop and escalate to qualified personnel.',
    },
    {
      id: 'ppe_visual_inspection',
      label: 'Appropriate PPE and safe visual inspection boundaries are understood',
      safetyCritical: false,
      checked: true,
      guidance:
        'Use appropriate PPE for the environment and limit actions to safe external visual inspection and documentation.',
    },
    {
      id: 'manufacturer_docs',
      label: 'Manufacturer documentation/procedures will be followed by qualified personnel when required',
      safetyCritical: false,
      checked: true,
      guidance:
        'AI guidance is advisory only. Qualified personnel must follow manufacturer procedures and site safety rules.',
    },
  ];
}

export function mergeChecklist(
  defaults: SafetyChecklistItem[],
  incoming: Partial<SafetyChecklistItem>[] | undefined,
): SafetyChecklistItem[] {
  if (!incoming?.length) return defaults;
  const byId = new Map(incoming.filter((i) => i.id).map((i) => [i.id as string, i]));
  return defaults.map((item) => {
    const found = byId.get(item.id);
    return found && typeof found.checked === 'boolean' ? { ...item, checked: found.checked } : item;
  });
}
