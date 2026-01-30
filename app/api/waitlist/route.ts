/**
 * Waitlist API - Add email to Streak CRM pipeline
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const STREAK_API_KEY = process.env.STREAK_API_KEY!;
const STREAK_PIPELINE_KEY = process.env.STREAK_PIPELINE_KEY!;

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const displayName = name?.trim() || email.split('@')[0];
    const timestamp = new Date().toISOString();

    // Create a box (lead) in Streak pipeline using v2 API
    const boxResponse = await fetch(`https://api.streak.com/api/v2/pipelines/${STREAK_PIPELINE_KEY}/boxes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(STREAK_API_KEY + ':').toString('base64')}`,
      },
      body: JSON.stringify({
        name: `${displayName} (${email})`, // Name with email for easy ID
        notes: [
          '📧 WAITLIST SIGNUP',
          '─────────────────',
          `Name: ${displayName}`,
          `Email: ${email}`,
          `Source: soulprintengine.ai`,
          `Date: ${timestamp}`,
        ].join('\n'),
      }),
    });

    if (!boxResponse.ok) {
      const errorText = await boxResponse.text();
      console.error('[Waitlist] Streak box creation failed:', errorText);
      return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
    }

    const box = await boxResponse.json();
    console.log(`[Waitlist] Added ${email} to Streak pipeline (box: ${box.boxKey})`);

    return NextResponse.json({ 
      success: true,
      message: "You're on the list! We'll reach out soon.",
    });

  } catch (error) {
    console.error('[Waitlist] Error:', error);
    return NextResponse.json({ 
      error: 'Something went wrong. Please try again.' 
    }, { status: 500 });
  }
}
