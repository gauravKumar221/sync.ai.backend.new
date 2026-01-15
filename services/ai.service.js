// import fs from "fs";
// import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { systemStyle } from "../data/knowledge.js";
import { findProduct } from "./product.service.js";

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


// 🧠 AI-based symptom intent detection (UNCHANGED)
async function detectSymptomIntent(text) {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
            role: "user",
            parts: [{
                text: `
User message: "${text}"

Reply with only ONE word:
"SYSTEM" → if the user is talking about health problems or symptoms
"OTHER" → otherwise
`
            }]
        }]
    });

    return response.text.trim().toUpperCase() === "SYSTEM";
}


// 🧠 AI-based booking intent detection (UNCHANGED)
async function detectBookingIntent(text) {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
            role: "user",
            parts: [{
                text: `
User message: "${text}"

Reply with only ONE word:
"BOOKING" → if user wants appointment, consultation, doctor talk, call back
"OTHER" → otherwise
`
            }]
        }]
    });

    return response.text.trim().toUpperCase() === "BOOKING";
}


// 🤖 MAIN PROCESSOR
export async function processMessage(text) {
    try {
        const msg = text.toLowerCase();

        // 🥇 PRODUCT FIRST — FAST & FREE (no AI)
        const matchedProducts = findProduct(msg);
        if (matchedProducts.length) {
            let reply = "Here are some products that may help:\n\n";
            matchedProducts.slice(0, 3).forEach(p => {
                reply += `${p.brand_name} (${p.composition}) - ₹${p.price}\n`;
            });
            reply += "\nIf you need guidance, tell me your problem.";
            return reply;
        }

        // 🥈 INTENT DETECTION (AI, but controlled)
        const [isBooking, isSymptom] = await Promise.all([
            detectBookingIntent(text),
            detectSymptomIntent(text)
        ]);

        // 🧾 BOOKING SHORT-CIRCUIT
        if (isBooking) {
            return "INTENT:BOOKING";
        }

        // 🧠 SYMPTOM CONVERSATION
        if (isSymptom) {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{
                    role: "user",
                    parts: [{
                        text: systemStyle + `
User problem: ${text}

Give helpful guidance in simple language.
Ask 1–2 follow-up questions.
Then gently suggest booking a consultation.
`
                    }]
                }]
            });

            return response.text.trim();
        }

        // 🥉 NORMAL CHAT
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: "user",
                parts: [{ text: systemStyle + "\n\nUser message:\n" + text }]
            }]
        });

        return response.text.trim();

    } catch (error) {
        console.error("AI Error:", error.message);
        return "Sorry, system thoda busy hai. Thodi der baad try karein.";
    }
}


// 📋 BOOKING TEMPLATE
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
