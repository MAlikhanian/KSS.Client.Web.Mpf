import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { getSaleChannels } from '@/services/mpf-report-api';

// GET /api/mpf/report/channels?scuCmpyDurId=… — sales-channel filter options.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const id = Number(request.nextUrl.searchParams.get('scuCmpyDurId') ?? 0);
    const result = await getSaleChannels(session.accessToken, id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching MPF channels:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
