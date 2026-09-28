import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { searchCustomers } from '@/services/mpf-report-api';

// GET /api/mpf/report/customers?q=… — customer autocomplete for the party picker.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const q = request.nextUrl.searchParams.get('q') ?? '';
    const cityIdParam = request.nextUrl.searchParams.get('cityId');
    const cityId = cityIdParam ? Number(cityIdParam) : null;
    const result = await searchCustomers(session.accessToken, q, cityId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error searching MPF customers:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
