// import fs from "fs";
// import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { systemStyle } from "../data/knowledge.js";
import { findProduct } from "./product.service.js";
// ✅ ADD THIS IMPORT
import { parseBookingMessage } from "./booking.service.js";

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

// ✅ ADD THIS FUNCTION: Check if message has complete booking details
function hasCompleteBookingDetails(text) {
    const bookingData = parseBookingMessage(text);

    // Check if all required fields are present and not empty
    const hasName = bookingData.name && bookingData.name.trim().length > 0;
    const hasPhone = bookingData.phone && bookingData.phone.trim().length > 0;
    const hasProblem = bookingData.problem && bookingData.problem.trim().length > 0;
    const hasDate = bookingData.date && bookingData.date.trim().length > 0;
    const hasTime = bookingData.time && bookingData.time.trim().length > 0;

    return hasName && hasPhone && hasProblem && hasDate && hasTime;
}

// ✅ ADD THIS FUNCTION: Check if message has partial booking details
function hasPartialBookingDetails(text) {
    const bookingData = parseBookingMessage(text);

    // Count how many booking fields are present
    const fields = ['name', 'phone', 'problem', 'date', 'time'];
    let presentCount = 0;

    fields.forEach(field => {
        if (bookingData[field] && bookingData[field].trim().length > 0) {
            presentCount++;
        }
    });

    return presentCount > 0 && presentCount < fields.length;
}


// 🤖 MAIN PROCESSOR - UPDATED
export async function processMessage(text) {
    try {
        const msg = text.toLowerCase();

        // ✅ ADD THIS CHECK FIRST: Check for complete booking details
        if (hasCompleteBookingDetails(text)) {
            const bookingData = parseBookingMessage(text);
            return `BOOKING_DATA:${JSON.stringify(bookingData)}`;
        }

        // ✅ ADD THIS CHECK: Check for partial booking details
        if (hasPartialBookingDetails(text)) {
            const bookingData = parseBookingMessage(text);
            const missingFields = [];

            if (!bookingData.name || !bookingData.name.trim()) missingFields.push("Name");
            if (!bookingData.phone || !bookingData.phone.trim()) missingFields.push("Mobile");
            if (!bookingData.problem || !bookingData.problem.trim()) missingFields.push("Problem");
            if (!bookingData.date || !bookingData.date.trim()) missingFields.push("Date");
            if (!bookingData.time || !bookingData.time.trim()) missingFields.push("Time");

            return `PARTIAL_BOOKING:${JSON.stringify({
                missing: missingFields,
                provided: bookingData
            })}`;
        }

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

// ✅ ADD THESE HELPER FUNCTIONS:
export function formatBookingConfirmation(bookingData) {
    return `✅ I've received your booking details:\n\nName: ${bookingData.name}\nMobile: ${bookingData.phone}\nProblem: ${bookingData.problem}\nDate: ${bookingData.date}\nTime: ${bookingData.time}\n\nProcessing your appointment...`;
}

export function askForMissingFields(missingFields) {
    return `I need a few more details:\n\nMissing: ${missingFields.join(', ')}\n\nPlease provide the missing information in the same format.`;
}

// ✅ ADD THIS FUNCTION: Simple check for booking keywords (fallback)
export function hasBookingKeywords(text) {
    const bookingKeywords = [
        'book', 'booking', 'appointment', 'consultation',
        'schedule', 'slot', 'doctor', 'clinic', 'visit',
        'appoint', 'reserve', 'time', 'date'
    ];

    const lowerText = text.toLowerCase();
    return bookingKeywords.some(keyword => lowerText.includes(keyword));
}