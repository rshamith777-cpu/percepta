import { AppShell } from '@/components/AppShell';
import { DiagnosisWorkbench } from '@/components/diagnosis/DiagnosisWorkbench';

export default function Home() {
  return (
    <AppShell>
      <DiagnosisWorkbench />
    </AppShell>
  );
}
