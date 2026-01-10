import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { systemStyle, knowledgeBase } from "../data/knowledge.js";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function getKnowledgeReply(text) {
    text = text.toLowerCase();

    for (const key in knowledgeBase) {
        if (text.includes(key)) {
            return knowledgeBase[key];
        }
    }
    return null;
}

export function isBookingQuery(text) {
    const bookingKeywords = ["book", "appointment", "consultation", "doctor"];
    return bookingKeywords.some(keyword => text.includes(keyword));
}

export function getBookingTemplate() {
    return `Sure! To book a consultation, please reply with the following details:\n\n- Name:\n- Mobile Number:\n- Problem:\n- Preferred Date: (e.g., 2026-01-15)\n- Preferred Time: (e.g., 10:00 AM)`;
}


export async function processMessage(text) {

    // 🧠 Step 1 — Knowledge layer
    const knowledgeReply = getKnowledgeReply(text);
    if (knowledgeReply) return knowledgeReply;

    // 🤖 Step 2 — AI fallback
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [{
                        text: `${systemStyle}\n\nUser message: ${text}`
                    }]
                }
            ]
        });

        return response.text.trim();

    } catch (error) {
        console.error("Gemini Error:", error);
        return "Sorry, I am currently unavailable. Please try again shortly.";
    }
}
