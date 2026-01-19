'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function signUp(formData: FormData) {
    const supabase = await createClient()

    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
            },
        },
    })

    if (error) {
        return { error: error.message }
    }

    // If user is auto-confirmed (email confirmation is off), redirect to welcome
    if (signUpData?.user?.email_confirmed_at || signUpData?.session) {
        revalidatePath('/', 'layout')
        redirect('/dashboard/welcome')
    }

    // Otherwise return success (email confirmation required)
    revalidatePath('/', 'layout')
    return { success: true }
}

export async function signIn(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard/welcome')
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    // Force clear all Supabase and SoulPrint related cookies
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()

    // Delete all Supabase auth cookies (handling potential multiple project IDs)
    allCookies.forEach(cookie => {
        if (cookie.name.startsWith('sb-') || cookie.name.startsWith('soulprint_')) {
            cookieStore.delete(cookie.name)
        }
    })

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signInWithGoogle() {
    const supabase = await createClient()

    // Get the base URL (works for both local and production)
    // Get the base URL
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL

    if (!baseUrl) {
        if (process.env.NODE_ENV === 'production') {
            // Default to custom domain in production
            baseUrl = 'https://soulprintengine.ai'
        } else if (process.env.VERCEL_URL) {
            // Fallback for Vercel previews if NODE_ENV is somehow not prod or handled differently
            baseUrl = `https://${process.env.VERCEL_URL}`
        } else {
            // Local development
            baseUrl = 'http://localhost:3000'
        }
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${baseUrl}/auth/callback`,
            queryParams: {
                prompt: 'select_account',
            },
        },
    })

    if (error) {
        return { error: error.message }
    }

    if (data.url) {
        redirect(data.url)
    }
}
