"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

/**
 * Automatically logs in with a dev account in development environment.
 * Configure via DEV_LOGIN_EMAIL and DEV_LOGIN_PASSWORD environment variables.
 * If the user doesn't exist or has a different password, it resets/creates them
 * using the Service Role key to ensure immediate access.
 */
export async function devLogin() {
    // 1. Safety Check: ONLY allow in development
    if (process.env.NODE_ENV !== "development") {
        console.error("Attempted dev login in non-development environment");
        return { error: "Dev login only available in development mode" };
    }

    const TARGET_EMAIL = process.env.DEV_LOGIN_EMAIL || "dev@example.com";
    const DEV_PASSWORD = process.env.DEV_LOGIN_PASSWORD || crypto.randomUUID();

    // 2. Use Service Role to Ensure User Exists/Has Password
    // We can't use the standard client for admin tasks, need direct supabase-js instance
    const adminSupabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    // Try to sign in first (fast path)
    const supabase = await createClient();

    // Check for user first (more reliable than getSession in server components)
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email === TARGET_EMAIL) {
        return; // Don't redirect, let the page/middleware handle it
    }

    const { error: initialSignInError } = await supabase.auth.signInWithPassword({
        email: TARGET_EMAIL,
        password: DEV_PASSWORD,
    });

    if (!initialSignInError) {
        // Success immediately
        redirect("/dashboard/chat");
    }

    // If failed, fix the user (Create or Update Password)
    const { data: userList } = await adminSupabase.auth.admin.listUsers();
    const existingUser = userList.users.find(u => u.email === TARGET_EMAIL);

    if (existingUser) {
        // User exists, just update password
        await adminSupabase.auth.admin.updateUserById(existingUser.id, {
            password: DEV_PASSWORD
        });
    } else {
        // Create new user
        await adminSupabase.auth.admin.createUser({
            email: TARGET_EMAIL,
            password: DEV_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: "Kid Quick (Dev)" }
        });
    }

    // 3. Retry Sign In
    const { error: retryError } = await supabase.auth.signInWithPassword({
        email: TARGET_EMAIL,
        password: DEV_PASSWORD,
    });

    if (retryError) {
        console.error("Dev Login Failed after fix:", retryError);
        return { error: retryError.message };
    }

    // 4. Redirect
    redirect("/dashboard/chat");
}
