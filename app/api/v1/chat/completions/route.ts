import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { gemini, DEFAULT_MODEL } from "@/lib/gemini/client";
import { checkHealth, streamChatCompletion, chatCompletion, ChatMessage } from "@/lib/llm/local-client";
import { loadMemory, buildSystemPrompt } from "@/lib/letta/soulprint-memory";

// Initialize Supabase Admin client (to bypass RLS for key check)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
    try {
        // 1. Extract API Key
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer sk-soulprint-")) {
            return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 });
        }

        const rawKey = authHeader.replace("Bearer ", "");
        const hashedKey = createHash("sha256").update(rawKey).digest("hex");

        // 2. Validate API Key & Get User
        let keyData;
        let keyError;

        if (rawKey === "sk-soulprint-demo-fallback-123456" || rawKey === "sk-soulprint-demo-internal-key") {
            // Use Elon's UUID for demo mode
            keyData = { user_id: 'dadb8b23-5684-4d86-9021-e457267e75c7', id: 'demo-fallback-id' };
            keyError = null;
        } else {
            const result = await supabaseAdmin
                .from("api_keys")
                .select("user_id, id")
                .eq("key_hash", hashedKey)
                .single();
            keyData = result.data;
            keyError = result.error;
        }

        if (keyError || !keyData) {
            return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
        }

        // 3. Fetch User's SoulPrint (System Message)
        const { data: soulprint } = await supabaseAdmin
            .from("soulprints")
            .select("soulprint_data")
            .eq("user_id", keyData.user_id)
            .maybeSingle();

        // 4. Parse Request Body
        const body = await req.json();
        const { messages, model = DEFAULT_MODEL, stream = false } = body;

        // ============================================================
        // 🚀 LOCAL AI PATH (Hermes 3 + Letta Memory)
        // ============================================================
        const isLocalUp = await checkHealth();

        if (isLocalUp) {
            console.log('🚀 Using Local Hermes 3 + Letta Memory');
            
            // A. Load Letta Memory
            const memory = await loadMemory(keyData.user_id);
            
            // B. Build "Mirror" System Prompt
            let soulprintObj = soulprint?.soulprint_data;
            if (typeof soulprintObj === 'string') {
                try { soulprintObj = JSON.parse(soulprintObj); } catch (e) { }
            }
            const systemPrompt = buildSystemPrompt(soulprintObj, memory);

            // C. Prepare Messages (Prepend System Prompt)
            const localMessages: ChatMessage[] = [
                { role: 'system', content: systemPrompt },
                ...messages.map((m: any) => ({ role: m.role, content: m.content }))
            ];

            // D. Stream Response
            if (stream) {
                const generator = streamChatCompletion(localMessages);
                const encoder = new TextEncoder();

                const stream = new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const text of generator) {
                                // Match OpenAI SSE format for frontend compatibility
                                const data = JSON.stringify({
                                    choices: [{ delta: { content: text } }]
                                });
                                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                            }
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                            controller.close();
                        } catch (e) {
                            controller.error(e);
                        }
                    }
                });

                return new NextResponse(stream, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    },
                });
            } else {
                // Standard Response
                const content = await chatCompletion(localMessages);
                return NextResponse.json({
                    id: `chatcmpl-local-${Date.now()}`,
                    object: 'chat.completion',
                    created: Math.floor(Date.now() / 1000),
                    model: 'hermes3',
                    choices: [{
                        index: 0,
                        message: { role: 'assistant', content },
                        finish_reason: 'stop'
                    }]
                });
            }
        }

        // ============================================================
        // ☁️ CLOUD FALLBACK (Gemini)
        // ============================================================
        console.log('☁️ Local AI Offline - Falling back to Gemini');

        let systemMessage = "You are a helpful AI assistant.";

        if (soulprint?.soulprint_data) {
            let soulprintObj = soulprint.soulprint_data;
            if (typeof soulprintObj === 'string') {
                try { soulprintObj = JSON.parse(soulprintObj); } catch (e) { }
            }

            if (soulprintObj?.full_system_prompt) {
                systemMessage = soulprintObj.full_system_prompt;
            } else {
                const traits = JSON.stringify(soulprintObj, null, 2);
                systemMessage = `You are a personalized AI assistant for the user.
Your personality and responses should be shaped by the following SoulPrint identity data:
${traits}

Always stay in character based on these traits.`;
            }
        }

        const geminiContents = messages
            .filter((m: { role: string }) => m.role !== 'system')
            .map((m: { role: string; content: string }) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        // 5. Call Gemini API
        if (stream) {
            // STREAMING RESPONSE
            const result = await gemini.models.generateContentStream({
                model: model,
                contents: geminiContents,
                config: {
                    systemInstruction: systemMessage,
                    maxOutputTokens: 2048,
                    temperature: 0.8,
                }
            });

            const stream = new ReadableStream({
                async start(controller) {
                    const encoder = new TextEncoder();
                    try {
                        for await (const chunk of result) {
                            // Extract text from the candidate parts
                            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) {
                                // Send in OpenAI stream format: data: { ... }
                                const data = JSON.stringify({
                                    choices: [{ delta: { content: text } }]
                                });
                                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                            }
                        }
                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                    } catch (e) {
                        controller.error(e);
                    }
                }
            });

            return new NextResponse(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });

        } else {
            // STANDARD RESPONSE
            const response = await gemini.models.generateContent({
                model: model,
                contents: geminiContents,
                config: {
                    systemInstruction: systemMessage,
                    maxOutputTokens: 2048,
                    temperature: 0.8,
                }
            });

            // Extract text from response candidates
            const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

            return NextResponse.json({
                id: `chatcmpl-${Date.now()}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: model,
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: responseText
                    },
                    finish_reason: 'stop'
                }],
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            });
        }

    } catch (geminiError: unknown) {
        console.error('❌ Gemini API Error:', geminiError);
        const errorMessage = geminiError instanceof Error ? geminiError.message : 'Unknown Gemini error';
        return NextResponse.json({
            error: `Gemini API error: ${errorMessage}`,
        }, { status: 500 });
    }
}
