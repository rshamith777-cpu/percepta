import { NextResponse } from 'next/server';

export async function GET() {
  const enabled = (process.env.GOOGLE_AGENT_SKILLS_ENABLED ?? '').toLowerCase() === 'true';
  return NextResponse.json({
    ok: false,
    feature: 'google-agent-skills-official',
    configured: enabled,
    available: false,
    verified: false,
    error: {
      code: 'AGENT_SKILLS_NOT_INTEGRATED',
      message:
        'No verified official Google Agent Skills integration is implemented. Local maintenance workflow/audit/export helpers exist but are not official Agent Skills. No external Agent Skills API call was made.',
    },
    blocker:
      'Requires official supported Agent Skills interfaces/access/permissions and verified integration with explicit human approval for consequential operations.',
  }, { status: 503 });
}
