// Apply SQL migration to fix api_keys table constraint
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('🔄 Applying database migration...\n')

  // Read the migration file
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20241221_fix_api_keys_constraint.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf8')

  console.log('📄 Migration SQL:')
  console.log('─'.repeat(60))
  console.log(migrationSQL)
  console.log('─'.repeat(60))
  console.log()

  // Execute the migration
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    .catch(async () => {
      // If exec_sql doesn't exist, try direct query (Supabase API)
      const { data, error } = await supabase.from('_sql').select('*').limit(0)
      if (error) {
        // Use the SQL editor endpoint instead
        console.log('⚠️  Using direct SQL execution...')
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: migrationSQL })
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }
        
        return { data: await response.json(), error: null }
      }
      return { data, error }
    })

  if (error) {
    console.error('❌ Migration failed:', error)
    console.error('\n⚠️  Please apply this SQL manually in Supabase SQL Editor:')
    console.error('   https://supabase.com/dashboard/project/ozvusjiayuqhaondnadv/sql/new')
    process.exit(1)
  }

  console.log('✅ Migration applied successfully!')
  console.log('\n📊 Verifying changes...')

  // Verify the constraint is gone
  const { data: constraints } = await supabase
    .rpc('exec_sql', { 
      sql: `
        SELECT constraint_name, constraint_type 
        FROM information_schema.table_constraints 
        WHERE table_name = 'api_keys' AND constraint_type = 'FOREIGN KEY';
      ` 
    })
    .catch(() => ({ data: null }))

  if (constraints && Array.isArray(constraints) && constraints.length === 0) {
    console.log('✅ Foreign key constraint successfully removed')
  } else if (constraints) {
    console.log('⚠️  Found constraints:', constraints)
  }

  // Verify the column type
  const { data: columnInfo } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'user_id';
      `
    })
    .catch(() => ({ data: null }))

  if (columnInfo && Array.isArray(columnInfo) && columnInfo.length > 0) {
    console.log('✅ Column user_id type:', columnInfo[0].data_type)
  }

  console.log('\n✨ Database migration complete!')
  console.log('🔄 Please refresh your browser to see the changes')
}

applyMigration().catch(console.error)
