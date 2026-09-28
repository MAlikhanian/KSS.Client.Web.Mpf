import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { getCompanyPeriods } from '@/services/mpf-report-api';

// GET /api/mpf/report/periods — company + fiscal-period options for the selector.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const result = await getCompanyPeriods(session.accessToken);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching MPF periods:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
