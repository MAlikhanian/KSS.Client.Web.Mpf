import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { getStatement, type StatementQuery } from '@/services/mpf-report-api';

// POST /api/mpf/report/statement — customer Rial statement, proxied from
// KSS.Service.Report.MPF_ERP_Mabna (live MabnaERP base-table reconstruction).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const query = (await request.json()) as StatementQuery;
    if (!query?.totMergedPersonId || !query?.scuCmpyDurId) {
      return NextResponse.json({ message: 'totMergedPersonId and scuCmpyDurId are required' }, { status: 400 });
    }
    const result = await getStatement(session.accessToken, query);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching MPF statement:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
