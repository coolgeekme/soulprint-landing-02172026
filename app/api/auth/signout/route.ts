import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
  } catch (error) {
    console.error('[Signout] Error:', error);
    // Still redirect to login even if signout fails
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Signout] Error:', error);
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 });
  }
}
