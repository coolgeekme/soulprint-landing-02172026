import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.error('[Import:ClientError]', JSON.stringify({
      error: body.error,
      stack: body.stack,
      fileSize: body.fileSize,
      fileName: body.fileName,
      userAgent: body.userAgent,
    }));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
