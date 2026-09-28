import { NextResponse } from 'next/server';

/**
 * GET /mpf/api/manifest
 *
 * What this app contributes to the Shell's sidebar. The Shell aggregates every
 * registered zone's manifest into /api/menu at runtime, which is what lets a
 * new page — or a whole new domain — appear without rebuilding the Shell.
 *
 * Mirrors the entry this domain had in the Shell's config/menu.config.tsx
 * (lines 367-379) before the carve-out. Permissions are still enforced by the
 * Shell's filterMenuByRole against the session, exactly as before; the manifest
 * only declares what they are.
 *
 * Anonymous on purpose: it carries no data, only structure, and the Shell needs
 * it while building the shell chrome.
 */
export async function GET() {
  return NextResponse.json(
    {
      code: 'mpf',
      title: { fa: 'میلان پارس', en: 'Milan Pars' },
      icon: 'LayoutGrid',
      entries: [
        {
          id: 'mpf.report',
          title: { fa: 'گزارش میلان پارس', en: 'Milan Pars Report' },
          children: [
            {
              id: 'mpf.report.statement',
              title: { fa: 'صورت‌حساب مشتری', en: 'Customer Statement' },
              path: '/mpf/report',
              permissions: ['Milan.Report.Read'],
            },
          ],
        },
      ],
    },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  );
}
