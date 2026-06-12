import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { getSiteContent } from '@/lib/siteContent';
import { isFeatureEnabled } from '@/lib/featureTypes';
import { isXaiConfigured } from '@/lib/xai';
import { runGrokChat, type GrokChatMessage, type GrokChatMode } from '@/lib/grokAssistant';

const VALID_MODES: GrokChatMode[] = ['support', 'product', 'admin', 'content'];

export async function POST(request: NextRequest) {
  if (!isXaiConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Grok assistant is not configured on this server.' },
      { status: 503 }
    );
  }

  const content = await getSiteContent();
  if (!isFeatureEnabled(content.features, 'grokAssistant')) {
    return NextResponse.json({ success: false, error: 'Grok assistant is disabled' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const mode = body.mode as GrokChatMode;

    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json({ success: false, error: 'Invalid mode' }, { status: 400 });
    }

    if (mode === 'admin' || mode === 'content') {
      const isAdmin = await isAdminRequest(request);
      if (!isAdmin) {
        return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 401 });
      }
    }

    const history = Array.isArray(body.history)
      ? (body.history as GrokChatMessage[]).filter(
          (entry) =>
            entry &&
            (entry.role === 'user' || entry.role === 'assistant') &&
            typeof entry.content === 'string'
        )
      : undefined;

    const result = await runGrokChat({
      mode,
      message: String(body.message || ''),
      history,
      productSlug: typeof body.productSlug === 'string' ? body.productSlug : undefined,
      adminTask: typeof body.adminTask === 'string' ? body.adminTask : undefined,
      adminContext:
        body.adminContext && typeof body.adminContext === 'object' ? body.adminContext : undefined,
      contentType: typeof body.contentType === 'string' ? body.contentType : undefined,
      existingText: typeof body.existingText === 'string' ? body.existingText : undefined,
    });

    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, reply: result.reply });
  } catch (error) {
    console.error('Grok chat error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get Grok response' }, { status: 500 });
  }
}