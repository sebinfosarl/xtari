'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function analyzePdf(formData: FormData) {
    try {
        const file = formData.get('file') as File;

        if (!file) {
            return { success: false, error: 'No file provided' };
        }

        if (!apiKey) {
            return { success: false, error: 'GOOGLE_GEMINI_API_KEY or GOOGLE_API_KEY is not set in environment variables' };
        }

        const arrayBuffer = await file.arrayBuffer();
        console.log('ArrayBuffer size:', arrayBuffer.byteLength);
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');
        console.log('Base64 data length:', base64Data.length);

        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        const result = await model.generateContent([
            'Analyze this PDF document. Provide the output strictly as a JSON object with two keys: "summary" (a concise log of what it is about, dates, names, amounts) and "foundIds" (an array of strings containing any Order IDs or Shipping IDs found). Do not use markdown formatting for the JSON.',
            {
                inlineData: {
                    data: base64Data,
                    mimeType: 'application/pdf',
                },
            },
        ]);

        const response = await result.response;
        let text = response.text();

        // Clean up markdown code blocks if present (Gemini often wraps JSON in ```json ... ```)
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let parsedData = { summary: text, foundIds: [] as string[] };
        try {
            parsedData = JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse Gemini JSON output:', text);
            // Fallback: stick the whole text in summary if parsing fails
            parsedData = { summary: text, foundIds: [] };
        }

        return { success: true, data: parsedData };
    } catch (error: any) {
        console.error('Error analyzing PDF:', error);
        return { success: false, error: error.message || 'Failed to analyze PDF' };
    }
}
