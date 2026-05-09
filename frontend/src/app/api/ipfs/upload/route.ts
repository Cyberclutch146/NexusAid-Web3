import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ipfs/upload
 *
 * Accepts two types of uploads:
 *   1. Multipart form with a `file` field → pins file to IPFS
 *   2. JSON body with a `json` field      → pins JSON metadata to IPFS
 *
 * Both return: { cid: string }
 *
 * Pinata API keys are server-side only — never exposed to the browser.
 */

const PINATA_API_KEY    = process.env.PINATA_API_KEY!;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY!;
const PINATA_BASE_URL   = 'https://api.pinata.cloud';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pinataHeaders() {
  return {
    pinata_api_key:        PINATA_API_KEY,
    pinata_secret_api_key: PINATA_SECRET_KEY,
  };
}

function missingKeyResponse() {
  return NextResponse.json(
    { error: 'Pinata API keys not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY in .env.local' },
    { status: 500 }
  );
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    return missingKeyResponse();
  }

  const contentType = req.headers.get('content-type') || '';

  // ── Branch 1: File Upload (multipart/form-data) ──────────────────────────
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData();
      const file     = formData.get('file') as File | null;
      const name     = (formData.get('name') as string) || `nexusaid-${Date.now()}`;

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }

      // Build a fresh FormData to forward to Pinata
      const pinataForm = new FormData();
      pinataForm.append('file', file, file.name || name);
      pinataForm.append(
        'pinataMetadata',
        JSON.stringify({ name })
      );
      pinataForm.append(
        'pinataOptions',
        JSON.stringify({ cidVersion: 1 })
      );

      const pinataRes = await fetch(`${PINATA_BASE_URL}/pinning/pinFileToIPFS`, {
        method:  'POST',
        headers: pinataHeaders(),
        body:    pinataForm,
      });

      if (!pinataRes.ok) {
        const errText = await pinataRes.text();
        console.error('[IPFS Upload] Pinata file error:', errText);
        return NextResponse.json(
          { error: 'Pinata file upload failed', details: errText },
          { status: pinataRes.status }
        );
      }

      const result = await pinataRes.json() as { IpfsHash: string };
      return NextResponse.json({ cid: result.IpfsHash });

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[IPFS Upload] File upload exception:', message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ── Branch 2: JSON Metadata Upload (application/json) ────────────────────
  if (contentType.includes('application/json')) {
    try {
      const body = await req.json() as { json?: Record<string, unknown>; name?: string };

      if (!body.json) {
        return NextResponse.json({ error: 'No json field in request body' }, { status: 400 });
      }

      const name = body.name || `nexusaid-metadata-${Date.now()}`;

      const pinataRes = await fetch(`${PINATA_BASE_URL}/pinning/pinJSONToIPFS`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...pinataHeaders(),
        },
        body: JSON.stringify({
          pinataContent:  body.json,
          pinataMetadata: { name },
          pinataOptions:  { cidVersion: 1 },
        }),
      });

      if (!pinataRes.ok) {
        const errText = await pinataRes.text();
        console.error('[IPFS Upload] Pinata JSON error:', errText);
        return NextResponse.json(
          { error: 'Pinata JSON upload failed', details: errText },
          { status: pinataRes.status }
        );
      }

      const result = await pinataRes.json() as { IpfsHash: string };
      return NextResponse.json({ cid: result.IpfsHash });

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[IPFS Upload] JSON upload exception:', message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: 'Unsupported Content-Type. Use multipart/form-data or application/json.' },
    { status: 415 }
  );
}
