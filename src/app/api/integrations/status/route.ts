import { NextResponse } from 'next/server';
import { getIntegrationStatusSnapshot } from '@/modules/integrations/status';

export async function GET() {
  return NextResponse.json(getIntegrationStatusSnapshot());
}
