// Proxy to Motia backend for import status
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMotiaImportStatus } from '@/lib/motia-client'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get status from Motia
    const motiaStatus = await getMotiaImportStatus(user.id)

    if (!motiaStatus) {
      // Fall back to Supabase status
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('import_status, import_error, chunk_count, soulprint')
        .eq('user_id', user.id)
        .single()

      if (!profile) {
        return NextResponse.json({ status: 'idle' })
      }

      return NextResponse.json({
        status: profile.import_status || 'idle',
        error: profile.import_error,
        hasData: !!profile.chunk_count && profile.chunk_count > 0,
        hasSoulprint: !!profile.soulprint,
      })
    }

    // Merge Motia status with additional info
    return NextResponse.json({
      ...motiaStatus,
      source: 'motia',
    })

  } catch (error) {
    console.error('[Motia/Status] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
