import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = [
  'drew@archeforge.com',
  'drewspatterson@gmail.com',
]

interface CostData {
  llm_input_tokens: number
  llm_output_tokens: number
  llm_call_count: number
  embedding_input_tokens: number
  embedding_call_count: number
  llm_cost_usd: number
  embedding_cost_usd: number
  total_cost_usd: number
}

interface UserCost {
  user_id: string
  total_cost_usd: number
  llm_cost_usd: number
  embedding_cost_usd: number
  llm_calls: number
  embedding_calls: number
  full_pass_status: string
  completed_at: string | null
}

interface ImportCostsResponse {
  timestamp: string
  users: UserCost[]
  summary: {
    total_imports: number
    avg_cost_usd: number
    max_cost_usd: number
    min_cost_usd: number
    all_under_budget: boolean
  }
}

export async function GET() {
  try {
    // Auth check
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Create admin Supabase client
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Query user_profiles for import cost data
    const { data: profiles, error: queryError } = await adminClient
      .from('user_profiles')
      .select('user_id, import_cost_json, full_pass_status, full_pass_completed_at')
      .not('import_cost_json', 'is', null)
      .order('full_pass_completed_at', { ascending: false })
      .limit(50)

    if (queryError) {
      console.error('Query error:', queryError)
      return NextResponse.json({ error: 'Failed to fetch import costs' }, { status: 500 })
    }

    // Parse and transform the data
    const users: UserCost[] = []
    const costs: number[] = []

    for (const profile of profiles || []) {
      try {
        // Parse import_cost_json (TEXT column containing JSON string)
        const costData: CostData = JSON.parse(profile.import_cost_json)

        users.push({
          user_id: profile.user_id.substring(0, 8), // Truncate for privacy
          total_cost_usd: costData.total_cost_usd,
          llm_cost_usd: costData.llm_cost_usd,
          embedding_cost_usd: costData.embedding_cost_usd,
          llm_calls: costData.llm_call_count,
          embedding_calls: costData.embedding_call_count,
          full_pass_status: profile.full_pass_status || 'unknown',
          completed_at: profile.full_pass_completed_at,
        })

        costs.push(costData.total_cost_usd)
      } catch (parseError) {
        console.error('Failed to parse import_cost_json:', parseError)
        // Skip malformed entries
        continue
      }
    }

    // Calculate summary statistics
    const totalImports = users.length
    const avgCost = costs.length > 0
      ? costs.reduce((sum, cost) => sum + cost, 0) / costs.length
      : 0
    const maxCost = costs.length > 0 ? Math.max(...costs) : 0
    const minCost = costs.length > 0 ? Math.min(...costs) : 0
    const allUnderBudget = costs.every(cost => cost < 0.10)

    const response: ImportCostsResponse = {
      timestamp: new Date().toISOString(),
      users,
      summary: {
        total_imports: totalImports,
        avg_cost_usd: Math.round(avgCost * 10000) / 10000, // Round to 4 decimal places
        max_cost_usd: Math.round(maxCost * 10000) / 10000,
        min_cost_usd: Math.round(minCost * 10000) / 10000,
        all_under_budget: allUnderBudget,
      },
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('Import costs error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
