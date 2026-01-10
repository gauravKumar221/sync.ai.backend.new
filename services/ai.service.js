import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { systemStyle } from "../data/knowledge.js";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function processMessage(text) {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: systemStyle + "\n\nUser message:\n" + text
                        }
                    ]
                }
            ]
        });

        return response.text.trim();
    } catch (error) {
        console.error("Gemini Error:", error);
        throw error;
    }
}

export function getBookingTemplate() {
    return `
Sure, I can help you book your consultation.

Please reply in this format:

Name:
Mobile:
Problem:
Preferred Date:
Preferred Time:
`;
}
