import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function migrateSoulPrints() {
    console.log('🚀 Starting SoulPrint data migration...')

    // 1. Fetch all soulprints that need migration (where name is null)
    let page = 0
    let pageSize = 50
    let hasMore = true
    let totalUpdated = 0

    while (hasMore) {
        const { data, error } = await supabase
            .from('soulprints')
            .select('id, soulprint_data')
            .is('name', null)
            .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) {
            console.error('Error fetching soulprints:', error)
            break
        }

        if (!data || data.length === 0) {
            hasMore = false
            continue
        }

        console.log(`Processing batch ${page + 1} (${data.length} records)...`)

        for (const sp of data) {
            const json = sp.soulprint_data as any
            if (!json) continue

            const name = json.name || json.archetype || 'Unnamed SoulPrint'
            const archetype = json.archetype || 'Unknown'

            const { error: updateError } = await supabase
                .from('soulprints')
                .update({
                    name: name,
                    archetype: archetype
                })
                .eq('id', sp.id)

            if (updateError) {
                console.error(`Failed to update ${sp.id}:`, updateError)
            } else {
                totalUpdated++
            }
        }

        page++
    }

    console.log(`✅ Migration complete. Updated ${totalUpdated} records.`)
}

migrateSoulPrints().catch(console.error)
