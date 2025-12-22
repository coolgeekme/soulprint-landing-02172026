"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { randomBytes, createHash } from "crypto"

export async function generateApiKey(label: string = "Default Key") {
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
                    // Server actions can't set cookies easily in this context without middleware response, 
                    // but we are just reading auth here mostly.
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // Validate user authentication
    if (!user) {
        return { 
            error: "Authentication required",
            details: "User not authenticated. Please log in."
        }
    }

    if (!user.email) {
        return { 
            error: "Email not available",
            details: "User email is required but not found in session."
        }
    }

    // Generate a secure key
    // Format: sk-soulprint-[random-hex]
    const rawKey = 'sk-soulprint-' + randomBytes(24).toString('hex')

    // Hash it for storage
    const hashedKey = createHash('sha256').update(rawKey).digest('hex')

    // Store in Supabase
    // Note: We need the service role key to write to this table if RLS is strict,
    // or ensure the user has insert rights.
    // For now using the client context (RLS should allow user to insert their own keys).

    const { data, error } = await supabase
        .from('api_keys')
        .insert({
            user_id: user.id, // Use UUID as primary identifier
            label,
            key_hash: hashedKey,
            // We don't store the raw key!
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating key:", error)
        return { 
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        }
    }

    // Return the RAW key to the user (one time only)
    return { apiKey: rawKey, id: data.id }
}

export async function listApiKeys() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) { },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // Validate user authentication
    if (!user || !user.email) {
        return { 
            error: "Authentication required",
            keys: [] 
        }
    }

    const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id) // Use UUID as primary identifier
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching keys:", error)
        return { 
            error: error.message,
            code: error.code,
            details: error.details,
            keys: []
        }
    }

    return { keys: data }
}

export async function revokeApiKey(id: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) { },
            },
        }
    )

    const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id)

    if (error) {
        console.error("Error revoking key:", error)
        return { 
            error: error.message,
            code: error.code,
            details: error.details
        }
    }

    return { success: true }
}
