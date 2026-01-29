import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, formatTaskEmail } from '@/lib/email';
import { searchWeb, SearchResult } from '@/lib/search/tavily';

// This runs via Vercel Cron - check every 15 minutes
// vercel.json: { "crons": [{ "path": "/api/cron/tasks", "schedule": "*/15 * * * *" }] }

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Format search results into a nice HTML email section
 */
function formatNewsForEmail(results: SearchResult[], answer?: string): string {
  if (!results.length) {
    return '<p>No recent news found. Check back later!</p>';
  }

  let html = '';
  
  if (answer) {
    html += `<div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
      <p style="margin: 0; font-style: italic; color: #1e40af;">${answer}</p>
    </div>`;
  }

  html += '<div style="margin-top: 16px;">';
  
  for (const result of results) {
    html += `
      <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
        <a href="${result.url}" style="color: #2563eb; text-decoration: none; font-weight: 600; font-size: 16px;">
          ${result.title}
        </a>
        <p style="color: #4b5563; margin: 8px 0 4px 0; font-size: 14px; line-height: 1.5;">
          ${result.content.slice(0, 300)}${result.content.length > 300 ? '...' : ''}
        </p>
        <span style="color: #9ca3af; font-size: 12px;">${new URL(result.url).hostname}</span>
      </div>
    `;
  }
  
  html += '</div>';
  return html;
}

/**
 * Fetch real-time AI news using Tavily
 */
async function fetchAINews(): Promise<{ content: string; error?: string }> {
  try {
    const response = await searchWeb('latest AI artificial intelligence news today', {
      maxResults: 5,
      searchDepth: 'advanced',
      includeAnswer: true,
    });
    
    const formattedHtml = formatNewsForEmail(response.results, response.answer);
    return { content: formattedHtml };
  } catch (error) {
    console.error('[Cron] Failed to fetch AI news:', error);
    return { 
      content: '<p>Unable to fetch latest news at this time. We\'ll try again next time!</p>',
      error: String(error),
    };
  }
}

/**
 * Fetch content based on a custom prompt using web search
 */
async function fetchCustomContent(prompt: string): Promise<{ content: string; error?: string }> {
  try {
    // Clean up the prompt for search
    const searchQuery = prompt
      .replace(/^(remind me to|send me|tell me about|update me on)/i, '')
      .trim();
    
    const response = await searchWeb(searchQuery, {
      maxResults: 5,
      searchDepth: 'basic',
      includeAnswer: true,
    });
    
    if (!response.results.length) {
      // No search results - provide a helpful response
      return {
        content: `<p>I searched for "<em>${searchQuery}</em>" but didn't find any specific results.</p>
          <p>Here's your original request: <strong>${prompt}</strong></p>
          <p>Reply to this email if you'd like me to try a different approach!</p>`,
      };
    }
    
    let html = `<p style="margin-bottom: 16px;">Here's what I found for: <strong>${searchQuery}</strong></p>`;
    html += formatNewsForEmail(response.results, response.answer);
    
    return { content: html };
  } catch (error) {
    console.error('[Cron] Failed to fetch custom content:', error);
    return {
      content: `<p>I tried to look up: "<em>${prompt}</em>" but ran into an issue.</p>
        <p>I'll try again next time! Reply to this email if you want to chat about it now.</p>`,
      error: String(error),
    };
  }
}

export async function GET(req: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in development or if no secret set
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  const now = new Date();
  const results: { taskId: string; status: string; error?: string }[] = [];
  
  try {
    // Find tasks due to run
    const { data: dueTasks, error: fetchError } = await supabaseAdmin
      .from('recurring_tasks')
      .select('*, user:user_id(email)')
      .eq('is_active', true)
      .lte('next_run_at', now.toISOString())
      .limit(10); // Process max 10 per run to avoid timeout
    
    if (fetchError) throw fetchError;
    
    if (!dueTasks || dueTasks.length === 0) {
      return NextResponse.json({ message: 'No tasks due', processed: 0 });
    }
    
    for (const task of dueTasks) {
      try {
        // Get user's AI name
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('ai_name')
          .eq('id', task.user_id)
          .single();
        
        const aiName = profile?.ai_name || 'SoulPrint';
        const userEmail = task.delivery_email || (task.user as { email: string })?.email;
        
        if (!userEmail) {
          results.push({ taskId: task.id, status: 'failed', error: 'No email' });
          continue;
        }
        
        // Create task run record
        const { data: taskRun } = await supabaseAdmin
          .from('task_runs')
          .insert({
            task_id: task.id,
            user_id: task.user_id,
            status: 'running',
          })
          .select()
          .single();
        
        // Fetch REAL content based on task type
        let aiResponse = '';
        let fetchError: string | undefined;
        
        if (task.task_type === 'news') {
          // Fetch real-time AI news using Tavily
          const newsResult = await fetchAINews();
          aiResponse = newsResult.content;
          fetchError = newsResult.error;
        } else {
          // Custom task - search based on the prompt
          const customResult = await fetchCustomContent(task.prompt);
          aiResponse = customResult.content;
          fetchError = customResult.error;
        }
        
        // Format and send email
        const { subject, html } = formatTaskEmail({
          aiName,
          taskDescription: task.description || task.prompt.slice(0, 50),
          aiResponse,
        });
        
        const emailResult = await sendEmail({
          to: userEmail,
          subject,
          html,
        });
        
        // Update task run
        await supabaseAdmin
          .from('task_runs')
          .update({
            completed_at: new Date().toISOString(),
            status: emailResult.success ? 'success' : 'failed',
            ai_response: aiResponse,
            delivery_status: emailResult.success ? 'sent' : 'failed',
            error_message: emailResult.error || fetchError,
          })
          .eq('id', taskRun?.id);
        
        // Calculate next run time (tomorrow at same time)
        const nextRun = new Date(task.next_run_at);
        nextRun.setDate(nextRun.getDate() + 1);
        
        // Update task
        await supabaseAdmin
          .from('recurring_tasks')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRun.toISOString(),
            run_count: (task.run_count || 0) + 1,
          })
          .eq('id', task.id);
        
        results.push({ 
          taskId: task.id, 
          status: emailResult.success ? 'success' : 'failed',
          error: emailResult.error,
        });
        
      } catch (taskError) {
        console.error(`Task ${task.id} failed:`, taskError);
        results.push({ taskId: task.id, status: 'failed', error: String(taskError) });
      }
    }
    
    return NextResponse.json({
      message: 'Cron completed',
      processed: results.length,
      results,
    });
    
  } catch (error) {
    console.error('Cron failed:', error);
    return NextResponse.json({ error: 'Cron failed', details: String(error) }, { status: 500 });
  }
}
