import { NextRequest, NextResponse } from 'next/server';
import { enhanceStorytellingContent, generateDiagram } from '@/lib/gemini-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, locationName, type, prompt, diagramPrompt } = body;

    if (!locationName) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      );
    }

    switch (type) {
      case 'enhance':
        // Generate comprehensive enhancements
        if (!content) {
          return NextResponse.json(
            { error: 'Content is required for enhancement' },
            { status: 400 }
          );
        }
        const enhancements = await enhanceStorytellingContent(content, locationName);
        return NextResponse.json({ enhancements });

      case 'image':
        // Generate single image - try Tavily first for real historical photos
        if (!prompt) {
          return NextResponse.json(
            { error: 'Image prompt is required' },
            { status: 400 }
          );
        }
        
        // Note: SmartImage component relies directly on /api/research/imagen now.
        // This endpoint logic is just an extreme fallback in case other requests hit it.
        // Fallback to Picsum (Lorem Picsum - reliable placeholder service)
        const seed = locationName.toLowerCase().replace(/\s+/g, '-');
        const fallbackUrl = `https://picsum.photos/seed/${seed}/800/600`;
        return NextResponse.json({ 
          image: {
            url: fallbackUrl,
            alt: prompt,
            prompt: prompt,
            source: 'picsum'
          }
        });

      case 'diagram':
        // Generate single diagram
        if (!diagramPrompt) {
          return NextResponse.json(
            { error: 'Diagram prompt is required' },
            { status: 400 }
          );
        }
        const diagram = await generateDiagram(diagramPrompt);
        return NextResponse.json({ diagram });

      default:
        return NextResponse.json(
          { error: 'Invalid generation type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in storytelling generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}