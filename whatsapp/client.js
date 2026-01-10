import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import { isBookingQuery, getBookingTemplate } from '../services/ai.service.js';

// Ensure the path is correct
import { processMessage } from "../services/ai.service.js";

export async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("auth");

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        // Connection issues fix karne ke liye additions
        keepAliveIntervalMs: 30000,
        defaultQueryTimeoutMs: undefined
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) qrcode.generate(qr, { small: true });

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log("Connection closed, status:", statusCode);

            // 401 matlab logout, uske alawa sab par reconnect
            if (statusCode !== DisconnectReason.loggedOut) {
                console.log("Reconnecting in 5 seconds...");
                setTimeout(() => startWhatsApp(), 5000);
            }
        } else if (connection === "open") {
            console.log("WhatsApp connected successfully! ✅");
        }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;

        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        if (!text) return;
        console.log(`Received: ${text}`);

        try {
            // AI se reply generate karwayein
            const aiReply = await processMessage(text, from);

            // Logic check
            if (aiReply.includes("TRIGGER_BOOKING") || text.toLowerCase().includes("book")) {
                const bookingStatus = await createBooking(from);
                await sock.sendMessage(from, { text: bookingStatus });
            } else {
                await sock.sendMessage(from, { text: aiReply });
            }
        } catch (err) {
            console.error("Message handling error:", err);
        }
    });
}
