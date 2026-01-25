import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { invokeBedrockModel } from '@/lib/aws/bedrock';
import { checkOllamaHealth } from '@/lib/llm/local-client';

export async function GET(request: NextRequest) {
    try {
        const checks = {
            supabase: {
                configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                connected: false,
                error: null as string | null
            },
            bedrock: {
                configured: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY && !!process.env.BEDROCK_MODEL_ID,
                connected: false,
                error: null as string | null
            },
            ollama: {
                available: false,
                error: null as string | null
            },
            environment: {
                isServerless: !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
                nodeEnv: process.env.NODE_ENV || 'unknown'
            }
        };

        // Test Supabase Connection
        if (checks.supabase.configured) {
            try {
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );
                await supabase.from('profiles').select('count').limit(1).single();
                checks.supabase.connected = true;
            } catch (error) {
                checks.supabase.error = error instanceof Error ? error.message : 'Unknown connection error';
            }
        }

        // Test Bedrock Connection
        if (checks.bedrock.configured) {
            try {
                // Simple test message
                await invokeBedrockModel([
                    { role: 'user', content: 'test' }
                ]);
                checks.bedrock.connected = true;
            } catch (error) {
                checks.bedrock.error = error instanceof Error ? error.message : 'Bedrock connection failed';
            }
        }

        // Test Ollama (only if not serverless)
        if (!checks.environment.isServerless) {
            try {
                checks.ollama.available = await checkOllamaHealth();
            } catch (error) {
                checks.ollama.error = error instanceof Error ? error.message : 'Ollama check failed';
            }
        }

        // Calculate overall health
        const criticalServicesWorking = checks.supabase.connected && (checks.bedrock.connected || checks.ollama.available);
        const allServicesConfigured = checks.supabase.configured && (checks.bedrock.configured || checks.ollama.available);

        let status: 'healthy' | 'degraded' | 'critical' = 'critical';
        if (criticalServicesWorking && allServicesConfigured) {
            status = 'healthy';
        } else if (checks.supabase.connected || checks.bedrock.connected || checks.ollama.available) {
            status = 'degraded';
        }

        return NextResponse.json({
            status,
            timestamp: new Date().toISOString(),
            checks,
            summary: {
                chatWorking: criticalServicesWorking,
                databaseWorking: checks.supabase.connected,
                llmAvailable: checks.bedrock.connected || checks.ollama.available,
                configuredCorrectly: allServicesConfigured
            }
        }, {
            status: status === 'healthy' ? 200 : 503,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error) {
        console.error('Health check failed:', error);
        return NextResponse.json({
            status: 'critical',
            error: error instanceof Error ? error.message : 'Health check failed',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}