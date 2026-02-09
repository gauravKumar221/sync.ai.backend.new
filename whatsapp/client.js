import fs from "fs";
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";

// ✅ IMPORT ALL THE NEW FUNCTIONS
import {
    processMessage,
    getBookingTemplate,
    formatBookingConfirmation,
    askForMissingFields,
    hasBookingKeywords
} from "../services/ai.service.js";
import { parseBookingMessage, saveBooking, findBookingByPhone } from "../services/booking.service.js";
import path from "path";
import { findProduct } from "../services/product.service.js";

export async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("auth");

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        keepAliveIntervalMs: 30000,
        defaultQueryTimeoutMs: undefined
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) qrcode.generate(qr, { small: true });

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut) {
                setTimeout(() => startWhatsApp(), 5000);
            }
        } else if (connection === "open") {
            console.log("WhatsApp connected successfully");
        }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;

        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const phone = from.split("@")[0];
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (!text.trim()) return;

        console.log("📱 Received from", phone, ":", text);

        try {
            // 🧠 1️⃣ FIRST: Process message through AI service (which checks for booking data)
            const aiResponse = await processMessage(text);

            console.log("🤖 AI Response:", aiResponse); // Debug log

            // Handle different AI response types
            if (aiResponse.startsWith("BOOKING_DATA:")) {
                // ✅ Complete booking data detected by AI
                const bookingData = JSON.parse(aiResponse.replace("BOOKING_DATA:", ""));

                // Send confirmation
                await sock.sendMessage(from, {
                    text: formatBookingConfirmation(bookingData)
                });

                // Save to database
                try {
                    const result = await saveBooking(bookingData);
                    await sock.sendMessage(from, {
                        text: `🎉 Appointment booked successfully!\n\nBooking ID: ${result.bookingId}\n\nOur team will contact you shortly.`
                    });
                } catch (error) {
                    console.error("❌ Booking save error:", error);
                    await sock.sendMessage(from, {
                        text: "❌ Sorry, there was an error saving your booking. Please try again."
                    });
                }
                return;

            } else if (aiResponse.startsWith("PARTIAL_BOOKING:")) {
                // ⚠️ Partial booking data detected
                const data = JSON.parse(aiResponse.replace("PARTIAL_BOOKING:", ""));

                await sock.sendMessage(from, {
                    text: askForMissingFields(data.missing)
                });
                return;

            } else if (aiResponse === "INTENT:BOOKING") {
                // 📋 User wants to book but no details provided yet
                await sock.sendMessage(from, { text: getBookingTemplate() });
                return;

            } else if (aiResponse === "INTENT:BOOKING" || hasBookingKeywords(text)) {
                // Fallback: If AI says booking intent OR text has booking keywords
                await sock.sendMessage(from, { text: getBookingTemplate() });
                return;
            }

            // 🧴 2️⃣ Product handling (if AI didn't return booking-related response)
            const matchedProducts = findProduct(text);
            if (matchedProducts.length) {
                let responseText = "Based on your query, these products may help:\n\n";

                for (const product of matchedProducts.slice(0, 2)) {
                    responseText += `💊 ${product.brand_name} (${product.composition}) - ₹${product.price}\n`;
                }

                responseText += "\nFor personalized advice, please describe your symptoms.";
                await sock.sendMessage(from, { text: responseText });
                return;
            }

            // 🗨 3️⃣ Normal AI reply (if not booking or products)
            await sock.sendMessage(from, { text: aiResponse });

        } catch (error) {
            console.error("❌ Error processing message:", error);
            await sock.sendMessage(from, {
                text: "Sorry, system thoda busy hai. Thodi der baad try karein."
            });
        }
    });
}