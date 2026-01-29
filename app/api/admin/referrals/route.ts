import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Drew's user ID - only he can access admin endpoints
const ADMIN_USER_IDS: string[] = [
  // Add Drew's Supabase user ID here once known
  // For now, check by email
]

const ADMIN_EMAILS = [
  'drew@archeforge.com',
  'drewspatterson@gmail.com',
]

export async function GET() {
  try {
    // Verify the requesting user is an admin
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (by ID or email)
    const isAdmin = ADMIN_USER_IDS.includes(user.id) || 
                    ADMIN_EMAILS.includes(user.email || '')

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Use service role client to call admin function
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Call the RPC function to get stats
    const { data, error } = await adminClient.rpc('get_referral_stats')

    if (error) {
      console.error('Error fetching referral stats:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by team member (merge codes like ACE1 and ACE!1)
    const teamStats = new Map<string, {
      team_member: string
      codes: string[]
      total_signups: number
      total_messages: number
      unique_active_days: number
      last_active: string | null
      users: Array<{
        user_id: string
        signup_date: string
        messages: number
        active_days: number
        last_active: string | null
      }>
    }>()

    for (const row of data || []) {
      const existing = teamStats.get(row.team_member_name)
      if (existing) {
        existing.codes.push(row.referral_code)
        existing.total_signups += Number(row.total_signups)
        existing.total_messages += Number(row.total_messages)
        existing.unique_active_days += Number(row.unique_active_days)
        if (row.last_active && (!existing.last_active || new Date(row.last_active) > new Date(existing.last_active))) {
          existing.last_active = row.last_active
        }
        existing.users.push(...(row.signups || []))
      } else {
        teamStats.set(row.team_member_name, {
          team_member: row.team_member_name,
          codes: [row.referral_code],
          total_signups: Number(row.total_signups),
          total_messages: Number(row.total_messages),
          unique_active_days: Number(row.unique_active_days),
          last_active: row.last_active,
          users: row.signups || [],
        })
      }
    }

    return NextResponse.json({
      success: true,
      stats: Array.from(teamStats.values()).sort((a, b) => b.total_signups - a.total_signups),
      raw: data, // Include raw data for debugging
    })
  } catch (err) {
    console.error('Exception in referral stats API:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
