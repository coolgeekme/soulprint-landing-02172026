"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { switchSoulPrint } from "./soulprint-selection"

export async function deleteSoulPrint(soulprintId: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: { getAll() { return cookieStore.getAll() } }
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    // 1. Delete the SoulPrint
    const { error } = await supabase
        .from('soulprints')
        .delete()
        .eq('id', soulprintId)
        .eq('user_id', user.id)

    if (error) {
        console.error("Delete failed:", error)
        return { error: "Failed to delete SoulPrint" }
    }

    // 2. Check if we deleted the current active one
    const { data: profile } = await supabase
        .from('profiles')
        .select('current_soulprint_id')
        .eq('id', user.id)
        .single()

    // If the DB context was pointing to this deleted ID (or null/invalid), we need to switch
    // Note: The delete might have set 'current_soulprint_id' to NULL via ON DELETE SET NULL constraint?
    // Let's check if we have any left.

    const { data: remaining } = await supabase
        .from('soulprints')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

    if (remaining && remaining.length > 0) {
        // Switch to the newest remaining one
        await switchSoulPrint(remaining[0].id)
    } else {
        // None left
        // Set context to null? switchSoulPrint handles string...
        // We might need to handle empty state in switchSoulPrint or just clear
        // Ideally we update profile to NULL.
        await supabase.from('profiles').update({ current_soulprint_id: null }).eq('id', user.id)
        cookieStore.delete("soulprint_focus_id")
    }

    revalidatePath("/dashboard")
    return { success: true }
}
