'use server'

import { redirect } from 'next/navigation'

/**
 * @deprecated Gate registration has been replaced with standard signup.
 * This function now redirects to signup. Use signUp from auth.ts instead.
 */
export async function registerFromGate(_prevState: unknown, _formData: FormData) {
    redirect('/signup')
}
