import { NextResponse } from 'next/server';

// Diagnostic endpoint — checks if moderation can run
// Hit this in your browser: https://4olegacy.com/api/moderate/health
export async function GET() {
  const checks: Record<string, string> = {};

  // 1. Check env vars
  const geminiKey = process.env.GEMINI_API_KEY;
  const moderateSecret = process.env.MODERATE_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  checks['GEMINI_API_KEY'] = geminiKey
    ? `set (${geminiKey.length} chars, starts with ${geminiKey.slice(0, 4)}...)`
    : 'MISSING';
  checks['MODERATE_SECRET'] = moderateSecret ? `set (${moderateSecret.length} chars)` : 'MISSING';
  checks['NEXT_PUBLIC_SITE_URL'] = siteUrl || 'MISSING (will default to localhost:3000)';

  // 2. Test Gemini API with a tiny request
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent('Reply with exactly: OK');
      const text = result.response.text().trim();
      checks['GEMINI_API_CALL'] = `success — response: "${text.slice(0, 50)}"`;
    } catch (error) {
      checks['GEMINI_API_CALL'] = `FAILED — ${error instanceof Error ? error.message : String(error)}`;
    }
  } else {
    checks['GEMINI_API_CALL'] = 'skipped (no API key)';
  }

  // 3. Test self-fetch to moderate endpoint
  if (moderateSecret && siteUrl) {
    try {
      const res = await fetch(`${siteUrl}/api/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-moderate-secret': moderateSecret,
        },
        body: JSON.stringify({}), // empty body — should get 400 "postId required"
      });
      const body = await res.json();
      checks['SELF_FETCH'] = `status ${res.status} — ${JSON.stringify(body)}`;
    } catch (error) {
      checks['SELF_FETCH'] = `FAILED — ${error instanceof Error ? error.message : String(error)}`;
    }
  } else {
    checks['SELF_FETCH'] = 'skipped (missing MODERATE_SECRET or SITE_URL)';
  }

  return NextResponse.json(checks, { status: 200 });
}
