import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ensureDefaultApiKey } from '@/app/actions/api-keys'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const error = requestUrl.searchParams.get('error')
    const errorDescription = requestUrl.searchParams.get('error_description')

    if (error) {
        return NextResponse.redirect(new URL(`/?error=${errorDescription || error}`, requestUrl.origin))
    }

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Ensure every new user gets a default (inactive) API key
            await ensureDefaultApiKey()

            // Check if user already has a soulprint (existing user)
            const { data: { user } } = await supabase.auth.getUser()

            // Check for existing soulprint
            if (user) {
                const { count } = await supabase
                    .from('soulprints')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)

                if (count && count > 0) {
                    return NextResponse.redirect(new URL('/dashboard/chat', requestUrl.origin))
                }
            }

            // New user -> Welcome
            return NextResponse.redirect(new URL('/dashboard/welcome', requestUrl.origin))
        }
    }

    // Capture auth code exchange error or missing code
    return NextResponse.redirect(new URL('/?error=auth_code_missing', requestUrl.origin))
}
