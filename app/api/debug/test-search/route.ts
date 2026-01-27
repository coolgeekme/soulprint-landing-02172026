import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email') || 'kidquick360@gmail.com';
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Test different search queries
    const searches = [
      { name: 'all_unread', q: 'is:unread' },
      { name: 'from_email', q: `from:${email}` },
      { name: 'from_email_unread', q: `from:${email} is:unread` },
    ];
    
    const results: Record<string, number> = {};
    
    for (const search of searches) {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: search.q,
        maxResults: 10,
      });
      results[search.name] = response.data.messages?.length || 0;
    }
    
    return NextResponse.json({
      email,
      results,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
