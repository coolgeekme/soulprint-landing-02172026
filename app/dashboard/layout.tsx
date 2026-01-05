import { Sidebar } from "@/components/dashboard/sidebar"
import { TopBar } from "@/components/dashboard/top-bar"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Check if user has any soulprints
    let hasSoulprint = false
    if (user) {
        const { count } = await supabase
            .from('soulprints')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

        hasSoulprint = !!count && count > 0
    }

    return (
        <div className="flex h-screen bg-[#A1A1AA] text-white">
            <Sidebar hasSoulprint={hasSoulprint} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <TopBar />
                <main className="flex-1 overflow-hidden bg-[#A1A1AA] p-4">
                    {children}
                </main>
            </div>
        </div>
    )
}
