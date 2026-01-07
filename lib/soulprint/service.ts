import { SupabaseClient } from '@supabase/supabase-js';
import type { QuestionnaireAnswers } from '@/lib/gemini/types';
import { generateSoulPrint as generateSoulPrintOpenAI, soulPrintToDocument } from '@/lib/openai';
import { generateSoulPrint as generateSoulPrintLocal } from '@/lib/soulprint/generator';
import { saveSoulPrint } from './db';
import { checkHealth } from '@/lib/llm/local-client';

export async function processSoulPrint(
    supabaseAdmin: SupabaseClient,
    userId: string,
    answers: QuestionnaireAnswers,
    userData?: { email?: string; full_name?: string; avatar_url?: string }
) {
    console.log('🧠 Generating SoulPrint for user:', userId);

    // 1. Generate SoulPrint with Fallback (Local -> OpenAI GPT-4o)
    let soulprintData;
    const isLocalAvailable = await checkHealth();

    if (isLocalAvailable) {
        console.log('🤖 Local LLM available, attempting generation...');
        try {
            soulprintData = await generateSoulPrintLocal(answers, userId);
            console.log('✅ SoulPrint generated via Local LLM');
        } catch (error) {
            console.error('❌ Local SoulPrint generation failed, falling back to OpenAI:', error);
            soulprintData = await generateSoulPrintOpenAI(answers, userId);
            console.log('✅ SoulPrint generated via OpenAI GPT-4o (fallback)');
        }
    } else {
        console.log('☁️ Local LLM not available, using OpenAI GPT-4o...');
        soulprintData = await generateSoulPrintOpenAI(answers, userId);
        console.log('✅ SoulPrint generated via OpenAI GPT-4o');
    }

    console.log('✅ SoulPrint generated, archetype:', soulprintData.archetype);

    // 2. Save to Supabase soulprints table
    const savedRecord = await saveSoulPrint(supabaseAdmin, userId, soulprintData, userData);
    console.log('💾 SoulPrint saved to Supabase with ID:', savedRecord.id);

    // 3. Skip File Search Store operations (Gemini-specific feature removed)
    // The SoulPrint is now fully generated and saved without RAG indexing.
    // If you need RAG in the future, consider implementing with OpenAI Assistants API.

    return {
        success: true,
        message: 'SoulPrint generated and saved successfully',
        soulprint_id: savedRecord.id,
        user_id: userId,
        archetype: soulprintData.archetype,
        store_name: null,
        upload_operation: null,
        generated_at: soulprintData.generated_at,
        soulprint_data: soulprintData
    };
}
