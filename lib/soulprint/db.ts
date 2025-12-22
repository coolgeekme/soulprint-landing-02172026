import { SupabaseClient } from '@supabase/supabase-js';
import { SoulPrintData } from '@/lib/gemini';

export async function saveSoulPrint(
    supabase: SupabaseClient,
    userId: string,
    soulprintData: SoulPrintData
) {
    // Check if soulprint exists first to avoid ON CONFLICT error if constraint is missing
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
