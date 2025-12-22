import { SupabaseClient } from '@supabase/supabase-js';
import { 
    generateSoulPrint, 
    createFileSearchStore, 
    uploadToFileSearchStore, 
    soulPrintToDocument,
    QuestionnaireAnswers 
} from '@/lib/gemini';
import { saveSoulPrint } from './db';

export async function processSoulPrint(
    supabaseAdmin: SupabaseClient,
    userId: string,
    answers: QuestionnaireAnswers
) {
    console.log('🧠 Generating SoulPrint for user:', userId);

    // 1. Generate SoulPrint using Gemini
    const soulprintData = await generateSoulPrint(answers);
    console.log('✅ SoulPrint generated, archetype:', soulprintData.archetype);

    // 2. Save to Supabase soulprints table
    await saveSoulPrint(supabaseAdmin, userId, soulprintData);
    console.log('💾 SoulPrint saved to Supabase');

    // 3. Get or create Gemini File Search Store for user
    let storeName: string | null = null;
    let uploadOpName: string | null = null;

    try {
        const { data: existingStore, error: storeError } = await supabaseAdmin
            .from('gemini_file_stores')
            .select('store_name')
            .eq('user_id', userId)
            .single();

        if (storeError && storeError.code !== 'PGRST116') {
            console.warn('⚠️ Could not check for existing store:', storeError.message);
        }

        if (existingStore) {
            storeName = existingStore.store_name;
            console.log('📚 Using existing File Search Store:', storeName);
        } else {
            // Create new store
            const displayName = `soulprint-${userId.substring(0, 8)}`;
            const store = await createFileSearchStore(displayName);
            storeName = store.name;

            // Save store reference
            const { error: insertError } = await supabaseAdmin
                .from('gemini_file_stores')
                .insert({
                    user_id: userId,
                    store_name: storeName,
                    display_name: displayName
                });

            if (insertError) {
                console.warn('⚠️ Could not save store reference:', insertError.message);
            } else {
                console.log('📚 Created new File Search Store:', storeName);
            }
        }

        // 4. Upload SoulPrint as document to File Search Store
        if (storeName) {
            const documentContent = soulPrintToDocument(soulprintData);
            const uploadOp = await uploadToFileSearchStore(
                storeName,
                documentContent,
                'SoulPrint Identity Document'
            );
            uploadOpName = uploadOp.name;
            console.log('📤 Upload operation started:', uploadOpName);
        }
    } catch (fileSearchError) {
        console.warn('⚠️ File Search operations failed (continuing without RAG):', fileSearchError);
    }

    return {
        success: true,
        message: 'SoulPrint generated and saved successfully',
        user_id: userId,
        archetype: soulprintData.archetype,
        store_name: storeName,
        upload_operation: uploadOpName,
        generated_at: soulprintData.generated_at,
        soulprint_data: soulprintData
    };
}
