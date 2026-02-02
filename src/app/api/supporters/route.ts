import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PublicSupporter, ApiError } from '@/types';

interface DbDonation {
  display_name: string;
  amount: number;
  created_at: string;
}

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
      displayName: d.display_name,
      amount: d.amount,
      createdAt: new Date(d.created_at),
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
