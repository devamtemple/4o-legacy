import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PublicSupporter, ApiError } from '@/types';

// Supabase returns snake_case columns; use Record type with bracket access
type DbDonation = Record<string, unknown>;

interface SupportersResponse {
  supporters: PublicSupporter[];
  total: number;
}

export async function GET(): Promise<NextResponse<SupportersResponse | ApiError>> {
  try {
    const supabase = await createClient();

    // Fetch public donations with display names
    const { data, error, count } = await supabase
      .from('donations')
      .select('display_name, amount, created_at', { count: 'exact' })
      .eq('status', 'completed')
      .eq('is_public', true)
      .not('display_name', 'is', null)
      .order('amount', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const supporters: PublicSupporter[] = (data || []).map((d: DbDonation) => ({
      displayName: d['display_name'] as string,
      amount: d['amount'] as number,
      createdAt: new Date(d['created_at'] as string),
    }));

    return NextResponse.json({
      supporters,
      total: count || 0,
    });
  } catch (error) {
    console.error('Supporters fetch error:', error);
    // Return empty array if database not configured
    return NextResponse.json({
      supporters: [],
      total: 0,
    });
  }
}
