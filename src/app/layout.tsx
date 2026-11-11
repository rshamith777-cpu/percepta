import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/system/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: 'PERCEPTA | Botanical Multimodal Vision AI Copilot',
  description:
    'Percepta — Physical-World Multimodal Intelligence & Continuous Self-Learning Memory powered by Google DeepMind & Google Cloud.',
  applicationName: 'Percepta',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F7F3EB',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#F7F3EB] text-[#262D24] selection:bg-[#E5A98C]/40 selection:text-[#262D24]">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
