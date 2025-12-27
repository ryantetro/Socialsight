import { NextRequest, NextResponse } from 'next/server';
import { getCTRSuggestions } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        const { title, description } = await req.json();

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const suggestions = await getCTRSuggestions(title, description || '');

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('AI Suggestion error:', error);
        return NextResponse.json({ error: 'AI Suggestion failed' }, { status: 500 });
    }
}
