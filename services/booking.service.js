import db from "../config/db.js";

// Extract booking fields from WhatsApp text
export function parseBookingMessage(text) {
    const lines = text.split("\n");
    const data = {};

    for (const line of lines) {
        const [key, value] = line.split(":");

        if (!key || !value) continue;

        const k = key.trim().toLowerCase();

        if (k.includes("name")) data.name = value.trim();
        if (k.includes("mobile") || k.includes("phone")) data.phone = value.trim();
        if (k.includes("problem")) data.problem = value.trim();
        if (k.includes("date")) data.date = value.trim();
        if (k.includes("time")) data.time = value.trim();
    }

    return data;
}

// Save booking to database
export async function saveBooking(booking) {
    const { name, phone, problem, date, time } = booking;

    if (!name || !phone || !problem || !date || !time) {
        return { success: false, message: "Incomplete booking data" };
    }

    await db.promise().query(
        `INSERT INTO bookings (name, phone, problem, date, time, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, phone, problem, date, time, "Pending"]
    );

    return { success: true };
}
export async function findBookingByPhone(phone) {
    const [rows] = await db.promise().query(
        "SELECT * FROM bookings WHERE phone = ? ORDER BY id DESC LIMIT 1",
        [phone]
    );
    return rows[0];
}