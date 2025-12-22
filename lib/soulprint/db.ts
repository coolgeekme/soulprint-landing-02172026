import { SupabaseClient } from '@supabase/supabase-js';
import { SoulPrintData } from '@/lib/gemini';

export async function saveSoulPrint(
    supabase: SupabaseClient,
    userId: string,
    soulprintData: SoulPrintData,
    userData?: { email?: string; full_name?: string; avatar_url?: string }
) {
    // 1. Ensure profile exists (fail-safe for missing trigger/race condition)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileError);
    }

    if (!profile) {
        console.log('⚠️ Profile missing for user, creating fail-safe profile:', userId);
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                email: userData?.email || 'unknown@soulprint.ai',
                full_name: userData?.full_name || '',
                avatar_url: userData?.avatar_url || ''
            });

        if (insertError) {
            console.error('Failed to create fail-safe profile:', insertError);
            // We ignore errors here if it's a conflict (another process created it)
            if (insertError.code !== '23505') {
                throw new Error(`Profile creation failed: ${insertError.message}`);
            }
        }
    }

    // 2. Check if soulprint exists first to avoid ON CONFLICT error if constraint is missing
    const { data: existingSoulprint, error: fetchError } = await supabase
        .from('soulprints')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (fetchError) {
        console.error('Error checking existing soulprint:', fetchError);
        throw new Error('Failed to check existing soulprint');
    }

    if (existingSoulprint) {
        const { error } = await supabase
            .from('soulprints')
            .update({
                soulprint_data: soulprintData,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('soulprints')
            .insert({
                user_id: userId,
                soulprint_data: soulprintData,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    }
}
