/**
 * Check for user's forwarded ChatGPT export email
 * Called when user clicks "I've forwarded it"
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
  
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST() {
  try {
    // Get current user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user?.email) {
      return NextResponse.json({ status: 'error', error: 'Not authenticated' }, { status: 401 });
    }

    const userEmail = user.email.toLowerCase();
    console.log(`[Import Check] Looking for email from: ${userEmail}`);

    const gmail = await getGmailClient();
    const adminSupabase = getSupabaseAdmin();

    // Search for emails from this specific user
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `from:${userEmail} is:unread`,
      maxResults: 5,
    });

    const messages = response.data.messages || [];
    console.log(`[Import Check] Found ${messages.length} unread emails from ${userEmail}`);

    if (messages.length === 0) {
      return NextResponse.json({ 
        status: 'not_found',
        error: 'No email found. Make sure you forwarded from ' + userEmail
      });
    }

    // Process the first matching email
    for (const msg of messages) {
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      });

      // Get email body and look for ChatGPT download link
      const emailBody = getEmailBody(message.data.payload);
      const downloadUrl = extractChatGPTDownloadLink(emailBody);

      if (!downloadUrl) {
        console.log(`[Import Check] No download link found in email ${msg.id}`);
        continue;
      }

      console.log(`[Import Check] Found download link, fetching ZIP...`);

      // Download the ZIP
      let zipBuffer: Buffer;
      try {
        const downloadResponse = await fetch(downloadUrl);
        if (!downloadResponse.ok) {
          console.error(`[Import Check] Failed to download: ${downloadResponse.status}`);
          continue;
        }
        const arrayBuffer = await downloadResponse.arrayBuffer();
        zipBuffer = Buffer.from(arrayBuffer);
      } catch (e) {
        console.error(`[Import Check] Download error:`, e);
        continue;
      }

      // Create import job
      const { data: importJob, error: jobError } = await adminSupabase
        .from('import_jobs')
        .insert({
          user_id: user.id,
          status: 'pending',
          source_email: userEmail,
          source_type: 'chatgpt_export',
        })
        .select()
        .single();

      if (jobError || !importJob) {
        return NextResponse.json({ 
          status: 'error', 
          error: 'Failed to create import job' 
        });
      }

      // Trigger processing
      const processUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/import/process`;
      
      fetch(processUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          importJobId: importJob.id,
          userId: user.id,
          zipBase64: zipBuffer.toString('base64'),
        }),
      }).catch(e => console.error('[Import Check] Process trigger error:', e));

      // Mark email as read
      await gmail.users.messages.modify({
        userId: 'me',
        id: msg.id!,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });

      return NextResponse.json({ 
        status: 'processing',
        message: 'Found your email! Building your memory now...'
      });
    }

    // If we get here, none of the emails had valid download links
    return NextResponse.json({ 
      status: 'not_found',
      error: 'Found your email but couldn\'t extract the download link. Try forwarding again.'
    });

  } catch (error) {
    console.error('[Import Check] Error:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEmailBody(payload: any): string {
  if (!payload) return '';
  
  const bodies: string[] = [];
  
  if (payload.body?.data) {
    bodies.push(Buffer.from(payload.body.data, 'base64').toString('utf-8'));
  }
  
  if (payload.parts) {
    for (const part of payload.parts) {
      if ((part.mimeType === 'text/plain' || part.mimeType === 'text/html') && part.body?.data) {
        bodies.push(Buffer.from(part.body.data, 'base64').toString('utf-8'));
      }
      if (part.parts) {
        const nested = getEmailBody(part);
        if (nested) bodies.push(nested);
      }
    }
  }
  
  return bodies.join('\n\n');
}

function extractChatGPTDownloadLink(body: string): string | null {
  const decoded = body
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  const patterns = [
    // ChatGPT estuary/content endpoint (current format)
    /https:\/\/chatgpt\.com\/backend-api\/estuary\/content\?[^\s"'<>]+/i,
    // ChatGPT backend-api with .zip in params
    /https:\/\/chatgpt\.com\/backend-api\/[^\s"'<>]*\.zip[^\s"'<>]*/i,
    // Direct CDN download links
    /https:\/\/cdn\.oaistatic\.com\/[^\s"'<>]+/i,
    // ChatGPT export endpoints
    /https:\/\/chatgpt\.com\/[^\s"'<>]*export[^\s"'<>]*/i,
    // Links from href attributes
    /href=["']?(https:\/\/chatgpt\.com\/[^\s"'<>]+)["']?/i,
  ];
  
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match) {
      let url = match[1] || match[0];
      url = url.replace(/^href=["']?/i, '');
      url = url.replace(/["'>\s].*$/, '');
      url = url.replace(/[<>].*$/, '');
      
      if (url.startsWith('https://')) {
        console.log(`[Import Check] Found download link: ${url.substring(0, 80)}...`);
        return url;
      }
    }
  }
  
  return null;
}
