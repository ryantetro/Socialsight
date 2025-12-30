
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        hasKey: !!process.env.GEMINI_API_KEY,
        keyLength: process.env.GEMINI_API_KEY?.length
    });
}
