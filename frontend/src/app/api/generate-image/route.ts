import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const encodedPrompt = encodeURIComponent(prompt);
    const aiImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true`;
    
    // Server-side fetch to bypass CORS and 403 Forbidden issues on localhost browsers
    const response = await fetch(aiImageUrl, {
      headers: {
        'User-Agent': 'Community-Management-App/1.0',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch AI image from pollinations: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    
    // Return the image as a standard binary response so the client can create a blob
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store', // Avoid aggressive caching of dynamic prompts
      },
    });
  } catch (error: any) {
    console.error('Error generating image via proxy:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate image' }, { status: 500 });
  }
}
