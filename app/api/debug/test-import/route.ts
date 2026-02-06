/**
 * Test the full import flow - download ZIP, extract, show conversations
 */

import { NextResponse } from 'next/server';
import JSZip from 'jszip';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const downloadUrl = url.searchParams.get('url');
    
    if (!downloadUrl) {
      return NextResponse.json({ 
        error: 'Missing url parameter. Pass ?url=<chatgpt_download_url>' 
      });
    }

    console.log('[Test Import] Downloading from:', downloadUrl.substring(0, 80) + '...');
    
    // Step 1: Download the ZIP
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      return NextResponse.json({ 
        error: `Download failed: ${response.status} ${response.statusText}`,
        step: 'download'
      });
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);
    
    console.log('[Test Import] Downloaded ZIP, size:', zipBuffer.length, 'bytes');
    
    // Step 2: Extract the ZIP
    const zip = await JSZip.loadAsync(zipBuffer);
    const fileNames = Object.keys(zip.files);
    
    console.log('[Test Import] ZIP contains:', fileNames);
    
    // Step 3: Find and parse conversations.json
    interface ChatGPTConversation {
      id: string;
      title: string;
      create_time?: number;
      update_time?: number;
      mapping?: Record<string, {
        message?: {
          author?: { role: string };
          content?: { parts?: string[] };
        };
      }>;
    }
    
    let conversations: ChatGPTConversation[] = [];
    let conversationsFile = null;
    
    for (const fileName of fileNames) {
      if (fileName.includes('conversations.json') || fileName.endsWith('conversations.json')) {
        conversationsFile = fileName;
        const file = zip.files[fileName];
        if (!file) continue; // Should not happen but satisfy type checker
        const content = await file.async('string');
        conversations = JSON.parse(content);
        break;
      }
    }
    
    if (!conversationsFile) {
      return NextResponse.json({
        error: 'No conversations.json found in ZIP',
        step: 'extract',
        filesInZip: fileNames
      });
    }
    
    // Step 4: Summarize the conversations
    const summary = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      createTime: conv.create_time ? new Date(conv.create_time * 1000).toISOString() : null,
      updateTime: conv.update_time ? new Date(conv.update_time * 1000).toISOString() : null,
      messageCount: conv.mapping ? Object.keys(conv.mapping).length : 0,
    }));
    
    // Sort by update time (most recent first)
    summary.sort((a, b) => {
      const aTime = a.updateTime || a.createTime || '';
      const bTime = b.updateTime || b.createTime || '';
      return bTime.localeCompare(aTime);
    });
    
    // Get a sample message from the first conversation
    let sampleMessage = null;
    const firstConvo = conversations[0];
    if (firstConvo && firstConvo.mapping) {
      const mapping = firstConvo.mapping;
      const messageIds = Object.keys(mapping);
      for (const msgId of messageIds) {
        const node = mapping[msgId];
        if (!node) continue; // Skip undefined entries
        if (node.message?.content?.parts?.[0]) {
          sampleMessage = {
            role: node.message.author?.role,
            content: node.message.content.parts[0].substring(0, 200) + '...',
          };
          break;
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      zipSize: zipBuffer.length,
      filesInZip: fileNames,
      conversationsFile,
      totalConversations: conversations.length,
      recentConversations: summary.slice(0, 10),
      sampleMessage,
    });
    
  } catch (error) {
    console.error('[Test Import] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
