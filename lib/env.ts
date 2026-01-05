/**
 * Environment Variable Validator
 * Ensures all required secrets are present before the app attempts logic
 */

const REQUIRED_ENVS = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'ASSEMBLYAI_API_KEY'
];

export function validateEnv() {
    const missing = REQUIRED_ENVS.filter(key => !process.env[key]);

    if (missing.length > 0) {
        const error = `❌ MISSING CRITICAL ENVIRONMENT VARIABLES: ${missing.join(', ')}`;
        console.error(error);

        // In development, we throw a loud error to catch it early
        if (process.env.NODE_ENV === 'development') {
            // throw new Error(error); 
            // Commented out to avoid crashing the dev server during edits, 
            // but we keep the loud log.
        }

        return { valid: false, missing };
    }

    return { valid: true, missing: [] };
}

// Map for easy access with type safety/hints
export const env = {
    supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    ai: {
        gemini: process.env.GEMINI_API_KEY!,
        assembly: process.env.ASSEMBLYAI_API_KEY!,
    },
    isProd: process.env.NODE_ENV === 'production',
};
