import { ChatClient } from "./chat-client"
import { getSelectedSoulPrintId } from "@/app/actions/soulprint-selection"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function ChatPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        const { count } = await supabase
            .from('soulprints')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

        if (!count || count === 0) {
            redirect('/dashboard/welcome')
        }
    }

    // This runs on the server. When router.refresh() is called, this re-runs
    // and fetches the latest cookie value.
    const soulprintId = await getSelectedSoulPrintId() || null

    return <ChatClient initialSoulprintId={soulprintId} />
}
