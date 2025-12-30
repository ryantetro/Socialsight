
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const { prompt, metadata } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // Use Nano Banana Pro (Gemini 3 Pro Image Preview)
        const MODEL_ID = 'gemini-3-pro-image-preview';
        const model = genAI.getGenerativeModel({ model: MODEL_ID });

        console.log(`Calling ${MODEL_ID} (Nano Banana Pro) with Brand context for: ${metadata?.title || 'Unknown Brand'}`);

        const enhancedPrompt = `
            ROLE: You are an expert Minimalist Graphic Designer specialized in creating realistic, high-end SaaS marketing assets.
            TASK: GENERATE A PROFESSIONAL OPEN GRAPH IMAGE.
            
            BRAND CONTEXT:
            - Brand Name: ${metadata?.title || 'Professional Brand'}
            - Website: ${metadata?.hostname || 'Professional Website'}
            - Ecosystem: Modern SaaS / ShipFast ecosystem
            
            STYLE GUIDE (CRITICAL):
            - AVOID: Neon glows, complex 3D renders, "cybernetic" effects, or obvious AI-artist stylization.
            - PRIORITIZE: Realism, flat design, clean white/gray space, and professional UI cards.
            - ELEMENTS: Use crisp rounded-rectangle cards, simple symbolic emojis, and clean tech icons.
            - COMPOSITION: ${prompt}. It should look like a real Figma-designed asset or a high-quality screenshot.
            - COLORS: Balanced, professional palette. Deep grays/blacks with single-point indigo or blue accents. No cluttered gradients.
            
            REQUIREMENT: Return ONLY the high-fidelity image as inlineData. No text, no descriptions.
        `;

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: enhancedPrompt }]
            }]
        });

        const response = await result.response;

        // Extract parts to find image data (inlineData)
        const candidates = response.candidates || [];
        const parts = candidates[0]?.content?.parts || [];

        let imageUrl = null;
        let textResponse = '';

        for (const part of parts) {
            if (part.inlineData) {
                imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            } else if (part.text) {
                textResponse += part.text;
            }
        }

        if (imageUrl) {
            try {
                const { createClient } = await import('@/lib/supabase/server');
                const supabase = await createClient();
                const { data: { user } } = await supabase.auth.getUser();

                await supabase.from('ai_images').insert({
                    user_id: user?.id || null,
                    url: metadata?.url || metadata?.hostname || 'Unknown',
                    prompt: prompt,
                    image_data: imageUrl,
                });
            } catch (dbError) {
                console.error('Failed to log AI image to database:', dbError);
                // Don't fail the request if DB logging fails
            }
        }

        return NextResponse.json({
            imageUrl,
            text: textResponse,
            debugInfo: {
                modelUsed: MODEL_ID,
                hasImage: !!imageUrl,
                partsReceived: parts.length
            }
        });
    } catch (error: any) {
        console.error('Image Gen Error:', error);

        // Handle Quota explicitly to help user
        if (error.message?.includes('429')) {
            return NextResponse.json({
                error: 'AI Usage Limit Reached. Please try again in a minute.',
                isQuota: true
            }, { status: 429 });
        }

        return NextResponse.json({ error: error.message || 'Failed to generate image' }, { status: 500 });
    }
}
