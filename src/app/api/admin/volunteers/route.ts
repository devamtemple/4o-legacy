import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Volunteer, VolunteerStatus, ApiError } from '@/types';

interface DbVolunteer {
  id: string;
  name: string;
  email: string;
  twitter: string | null;
  reason: string;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface VolunteersResponse {
  volunteers: Volunteer[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

function transformDbVolunteer(db: DbVolunteer): Volunteer {
  return {
    id: db.id,
    name: db.name,
    email: db.email,
    twitter: db.twitter || undefined,
    reason: db.reason,
    status: db.status as VolunteerStatus,
    adminNotes: db.admin_notes || undefined,
    reviewedBy: db.reviewed_by || undefined,
    reviewedAt: db.reviewed_at ? new Date(db.reviewed_at) : undefined,
    createdAt: new Date(db.created_at),
  };
}

export async function GET(
  request: Request
): Promise<NextResponse<VolunteersResponse | ApiError>> {
  try {
    const supabase = await createClient();

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const status = searchParams.get('status') || 'pending';

    // Fetch volunteers
    let query = supabase
      .from('volunteers')
      .select('*', { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const volunteers = (data || []).map((v) => transformDbVolunteer(v as DbVolunteer));
    const total = count || 0;

    return NextResponse.json({
      volunteers,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error('Volunteers list error:', error);
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }
}

// Handle volunteer approval/rejection
export async function POST(
  request: Request
): Promise<NextResponse<{ success: boolean } | ApiError>> {
  try {
    const supabase = await createClient();

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { volunteerId, action, notes } = body;

    if (!volunteerId || !action) {
      return NextResponse.json({ error: 'Volunteer ID and action required' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update volunteer status
    const { error: updateError } = await supabase
      .from('volunteers')
      .update({
        status: newStatus,
        admin_notes: notes || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', volunteerId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update volunteer' }, { status: 500 });
    }

    // If approved, set moderator role on profiles table (if user exists)
    if (action === 'approve') {
      // Get volunteer email
      const { data: volunteer } = await supabase
        .from('volunteers')
        .select('email')
        .eq('id', volunteerId)
        .single();

      if (volunteer?.email) {
        // Find user by email and update their profile
        const { data: authUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', volunteer.email)
          .single();

        if (authUsers) {
          await supabase
            .from('profiles')
            .update({ is_moderator: true })
            .eq('id', authUsers.id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Volunteer action error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
