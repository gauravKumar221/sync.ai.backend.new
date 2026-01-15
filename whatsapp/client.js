import fs from "fs";
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";

import { processMessage, getBookingTemplate } from "../services/ai.service.js";
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

    //     sock.ev.on("messages.upsert", async ({ messages, type }) => {

    //         if (type !== "notify") return;

    //         const msg = messages[0];
    //         if (!msg.message || msg.key.fromMe) return;

    //         const from = msg.key.remoteJid;
    //         const phone = from.split("@")[0];
    //         const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    //         if (!text) return;

    //         // 🧾 Detect booking form
    //         const isBookingForm =
    //             /name:\s*.+\nmobile:\s*\d+.*\nproblem:\s*.+\npreferred date:\s*.+\npreferred time:\s*.+/i
    //                 .test(text);

    //         // 🧾 Detect booking status query
    //         const isBookingStatusQuery =
    //             /booking|status|confirm|confirmed|ho gaya|hua kya|application|mera booking|book hua/i
    //                 .test(text);

    //         // 🟢 Handle booking status
    //         if (isBookingStatusQuery) {
    //             const booking = await findBookingByPhone(phone);

    //             if (booking) {
    //                 await sock.sendMessage(from, {
    //                     text:
    //                         `Yes ${booking.name}, your booking is confirmed ✅

    // 📝 Problem: ${booking.problem}
    // 🗓 Date: ${booking.date}
    // ⏰ Time: ${booking.time}
    // Status: ${booking.status}

    // Our team will contact you shortly.`
    //                 });
    //             } else {
    //                 await sock.sendMessage(from, { text: "I couldn't find any booking. Would you like to book now?" });
    //             }
    //             return;
    //         }

    //         // 🟢 Handle booking form submission
    //         if (isBookingForm) {
    //             const bookingData = parseBookingMessage(text);
    //             const result = await saveBooking(bookingData);

    //             if (result.success) {
    //                 await sock.sendMessage(from, {
    //                     text:
    //                         `Thank you ${bookingData.name}! 🙏
    // Your consultation has been successfully booked.

    // 🗓 ${bookingData.date}
    // ⏰ ${bookingData.time}

    // Our team will contact you shortly.`
    //                 });
    //             } else {
    //                 await sock.sendMessage(from, { text: "Please send details again in correct format." });
    //             }
    //             return;
    //         }

    //         // 🧠 AI processing
    //         let aiReply;
    //         try {
    //             aiReply = await processMessage(text);
    //         } catch (e) {
    //             console.error(e);
    //             await sock.sendMessage(from, { text: "Sorry, I'm having trouble right now." });
    //             return;
    //         }
    //         // 🧾 Booking intent handling
    //         if (aiReply === "INTENT:BOOKING") {
    //             await sock.sendMessage(from, { text: getBookingTemplate() });
    //             return;
    //         }

    //         // 🧾 Show booking template if needed
    //         if (aiReply.includes("ACTION:SAVE_BOOKING")) {
    //             const bookingData = parseBookingMessage(text);
    //             const result = await saveBooking(bookingData);

    //             if (result.success) {
    //                 const thanksMessage =
    //                     `Thank you ${bookingData.name}! 🙏

    // Your consultation request has been received successfully.

    // 📝 Details:
    // Name: ${bookingData.name}
    // Mobile: ${bookingData.phone}
    // Problem: ${bookingData.problem}
    // Date: ${bookingData.date}
    // Time: ${bookingData.time}

    // Our medical team will contact you shortly to confirm your appointment.

    // If you need any help meanwhile, just message me.`;

    //                 await sock.sendMessage(from, { text: thanksMessage });
    //             } else {
    //                 await sock.sendMessage(from, {
    //                     text: "Please send the details again in the correct format so I can save your booking."
    //                 });
    //             }
    //             return;
    //         }


    //         // 🧴 Product handling (only if not booking flow)
    //         const matchedProducts = findProduct(text);

    //         if (matchedProducts.length) {
    //             let responseText = "Based on your problem, these medicines can help you:\n\n";

    //             for (const product of matchedProducts.slice(0, 2)) {
    //                 responseText += `${product.brand_name} (${product.composition}) - ₹${product.price}\n`;
    //             }

    //             responseText += "\nIf you'd like to place an order, just tell me.";

    //             for (const product of matchedProducts.slice(0, 2)) {
    //                 const imagePath = path.resolve(`products/images/${product.id}.jpg`);
    //                 if (fs.existsSync(imagePath)) {
    //                     await sock.sendMessage(from, {
    //                         image: { url: imagePath },
    //                         caption: `${product.brand_name}\n₹${product.price}`
    //                     });
    //                 }
    //             }

    //             await sock.sendMessage(from, { text: responseText });
    //             return;
    //         }

    //         // 🗨 Normal AI reply
    //         await sock.sendMessage(from, { text: aiReply });
    //     });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;

        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const phone = from.split("@")[0];
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (!text) return;

        console.log("Received:", text);

        // 🧾 1️⃣ Booking form detection FIRST
        const isBookingForm =
            /name:\s*.+\nmobile:\s*\d+.*\nproblem:\s*.+\npreferred date:\s*.+\npreferred time:\s*.+/i
                .test(text);

        if (isBookingForm) {
            const bookingData = parseBookingMessage(text);
            const result = await saveBooking(bookingData);

            if (result.success) {
                await sock.sendMessage(from, {
                    text:
                        `Thank you ${bookingData.name}! 🙏
Your consultation has been successfully booked.

📝 Problem: ${bookingData.problem}
🗓 Date: ${bookingData.date}
⏰ Time: ${bookingData.time}

Our medical team will contact you shortly.`
                });
            } else {
                await sock.sendMessage(from, {
                    text: "Please send the booking details again in the correct format."
                });
            }
            return;
        }

        // 🧾 2️⃣ Booking status check
        const isBookingStatusQuery =
            /booking|status|confirm|confirmed|ho gaya|hua kya|application|mera booking|book hua/i.test(text);

        if (isBookingStatusQuery) {
            const booking = await findBookingByPhone(phone);

            if (booking) {
                await sock.sendMessage(from, {
                    text:
                        `Yes ${booking.name}, your booking is confirmed ✅

📝 Problem: ${booking.problem}
🗓 Date: ${booking.date}
⏰ Time: ${booking.time}
Status: ${booking.status}`
                });
            } else {
                await sock.sendMessage(from, {
                    text: "No booking found for this number. Would you like to book a consultation?"
                });
            }
            return;
        }

        // 🧠 3️⃣ AI processing (ONLY if not booking)
        let aiReply;
        try {
            aiReply = await processMessage(text);
        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: "Sorry, system busy hai. Thodi der baad try karein." });
            return;
        }

        if (aiReply === "INTENT:BOOKING") {
            await sock.sendMessage(from, { text: getBookingTemplate() });
            return;
        }

        // 🧴 4️⃣ Product handling
        const matchedProducts = findProduct(text);
        if (matchedProducts.length) {
            let responseText = "Based on your problem, these medicines can help you:\n\n";

            for (const product of matchedProducts.slice(0, 2)) {
                responseText += `${product.brand_name} (${product.composition}) - ₹${product.price}\n`;
            }

            await sock.sendMessage(from, { text: responseText });
            return;
        }

        // 🗨 5️⃣ Normal AI reply
        await sock.sendMessage(from, { text: aiReply });
    });




}
