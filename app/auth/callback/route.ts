import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { ensureDefaultApiKey } from '@/app/actions/api-keys'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const error = requestUrl.searchParams.get('error')
    const errorDescription = requestUrl.searchParams.get('error_description')

    if (error) {
        return NextResponse.redirect(new URL(`/?error=${errorDescription || error}`, requestUrl.origin))
    }

    if (code) {
        const cookieStore = await cookies()
        
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options)
                        })
                    },
                },
            }
        )

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (!exchangeError) {
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
