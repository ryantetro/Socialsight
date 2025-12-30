import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function getCTRSuggestions(title: string, description: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
      Analyze the following SEO title and description. 
      Title: "${title}"
      Description: "${description}"

      Provide 3 alternative pairs of title and description that would have a significantly higher Click-Through Rate (CTR) for social media.
      Focus on being "punchy", "curiosity-driven", and "benefit-oriented".
      
      Format the output as a JSON array of objects: 
      [
        { "title": "...", "description": "..." },
        { "title": "...", "description": "..." },
        { "title": "...", "description": "..." }
      ]
      Return ONLY the JSON. No markdown backticks.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean markdown code blocks if present
    const cleanedText = text.replace(/```json|```/g, '').trim();

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Gemini error:', error);
    return [];
  }
}
