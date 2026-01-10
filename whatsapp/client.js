import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";

import { processMessage, getBookingTemplate } from "../services/ai.service.js";
import { parseBookingMessage, saveBooking, findBookingByPhone } from "../services/booking.service.js";

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
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (!text) return;

        console.log("Received:", text);

        let aiReply;
        try {
            aiReply = await processMessage(text);
        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: "Sorry, I'm having trouble right now. Please try again in a moment." });
            return;
        }

        if (aiReply.includes("ACTION:SHOW_BOOKING_TEMPLATE")) {
            await sock.sendMessage(from, { text: getBookingTemplate() });
            return;
        }

        if (aiReply.includes("ACTION:CHECK_BOOKING_STATUS")) {
            const phone = from.split("@")[0];
            const booking = await findBookingByPhone(phone);

            const bookingContext = booking
                ? `Booking Found:\nDate: ${booking.date}\nTime: ${booking.time}\nStatus: ${booking.status}`
                : `No booking found for this user.`;

            const finalReply = await processMessage(
                `User asked about booking status.\n${bookingContext}`
            );

            await sock.sendMessage(from, { text: finalReply });

            return;
        }

        if (aiReply.includes("ACTION:SAVE_BOOKING")) {
            const bookingData = parseBookingMessage(text);
            const result = await saveBooking(bookingData);

            if (result.success) {
                await sock.sendMessage(from, { text: "Your booking has been saved successfully." });
            } else {
                await sock.sendMessage(from, { text: "Please send the details in the correct format." });
            }
            return;
        }

        // Normal AI reply
        await sock.sendMessage(from, { text: aiReply });
    });
}
