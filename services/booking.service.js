import db from "../config/db.js";

// ✅ Convert date from dd/MM/yyyy to yyyy-MM-dd for MySQL
function convertToMySQLDate(dateStr) {
    if (!dateStr) return null;

    // If already in yyyy-MM-dd format, return as is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
    }

    // Convert from dd/MM/yyyy to yyyy-MM-dd
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            // Ensure 4-digit year
            const fullYear = year.length === 2 ? `20${year}` : year;
            return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }

    // If date is in any other format, try to parse it
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    } catch (error) {
        console.error('Error parsing date:', dateStr, error);
    }

    return dateStr; // Return original if can't convert
}

// Extract booking fields from WhatsApp text (Original)
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

// Save booking to database (Original - Improved)
export async function saveBooking(booking) {
    const { name, phone, problem, date, time } = booking;

    if (!name || !phone || !problem || !date || !time) {
        return { success: false, message: "Incomplete booking data" };
    }

    try {
        // ✅ Convert date format for MySQL
        const mysqlDate = convertToMySQLDate(date);

        const [result] = await db.promise().query(
            `INSERT INTO bookings (name, phone, problem, date, time, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, phone, problem, mysqlDate, time, "Pending"]
        );

        return {
            success: true,
            message: "Booking saved successfully",
            bookingId: result.insertId
        };
    } catch (error) {
        console.error("Error saving booking:", error);
        return { success: false, message: "Database error: " + error.message };
    }
}

// Find booking by phone (Original)
export async function findBookingByPhone(phone) {
    try {
        const [rows] = await db.promise().query(
            "SELECT * FROM bookings WHERE phone = ? ORDER BY id DESC LIMIT 1",
            [phone]
        );
        return rows[0];
    } catch (error) {
        console.error("Error finding booking:", error);
        return null;
    }
}

// ✅ NEW: Get all bookings (compatible with existing router)
export async function getAllBookings() {
    try {
        const [rows] = await db.promise().query(
            "SELECT * FROM bookings ORDER BY created_at DESC"
        );
        return rows; // Returns array directly for compatibility
    } catch (error) {
        console.error("Error getting bookings:", error);
        throw new Error("Database error");
    }
}

// ✅ NEW: Create booking (compatible with existing router) - FIXED DATE FORMAT
export async function createBooking(bookingData) {
    const { name, phone, problem, date, time, status = "Pending" } = bookingData;

    if (!name || !phone || !problem || !date || !time) {
        throw new Error("All fields are required: name, phone, problem, date, time");
    }

    try {
        // ✅ CONVERT DATE FORMAT HERE - THIS IS THE FIX
        const mysqlDate = convertToMySQLDate(date);

        if (!mysqlDate) {
            throw new Error("Invalid date format. Use DD/MM/YYYY or YYYY-MM-DD");
        }

        console.log(`Inserting date: ${date} -> ${mysqlDate}`); // Debug log

        const [result] = await db.promise().query(
            `INSERT INTO bookings (name, phone, problem, date, time, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, phone, problem, mysqlDate, time, status]
        );

        return { bookingId: result.insertId };
    } catch (error) {
        console.error("Error creating booking:", error);
        console.error("SQL Error details:", error.sql, error.sqlMessage);
        throw new Error("Database error: " + error.message);
    }
}

// ✅ NEW: Update booking status
export async function updateBookingStatus(id, status) {
    if (!id || !status) {
        throw new Error("Missing ID or status");
    }

    const validStatuses = ["Pending", "Scheduled", "Completed", "Cancelled", "Rescheduled"];
    if (!validStatuses.includes(status)) {
        throw new Error("Invalid status value");
    }

    try {
        const [result] = await db.promise().query(
            "UPDATE bookings SET status = ? WHERE id = ?",
            [status, id]
        );

        if (result.affectedRows === 0) {
            throw new Error("Booking not found");
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating status:", error);
        throw error;
    }
}

// ✅ NEW: Update booking details (alias for updateBooking)
export async function updateBookingDetails(id, updates) {
    return updateBooking(id, updates);
}

// ✅ NEW: Update booking (original name kept for backward compatibility)
export async function updateBooking(id, updates) {
    if (!id) {
        throw new Error("Missing booking ID");
    }

    // Allowed fields to update
    const allowedFields = ["name", "phone", "problem", "date", "time", "status"];
    const updateFields = [];
    const values = [];

    for (const field of allowedFields) {
        if (updates[field] !== undefined && updates[field] !== null) {
            updateFields.push(`${field} = ?`);

            // ✅ Convert date format if it's a date field
            if (field === 'date') {
                values.push(convertToMySQLDate(updates[field]));
            } else {
                values.push(updates[field]);
            }
        }
    }

    if (updateFields.length === 0) {
        throw new Error("No valid fields to update");
    }

    values.push(id);

    try {
        const query = `UPDATE bookings SET ${updateFields.join(", ")} WHERE id = ?`;
        const [result] = await db.promise().query(query, values);

        if (result.affectedRows === 0) {
            throw new Error("Booking not found or no changes made");
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating booking:", error);
        throw error;
    }
}

// ✅ NEW: Reschedule booking
export async function rescheduleBooking(id, date, time) {
    if (!id || !date || !time) {
        throw new Error("Missing ID, date or time");
    }

    try {
        // ✅ Convert date format
        const mysqlDate = convertToMySQLDate(date);

        const [result] = await db.promise().query(
            "UPDATE bookings SET date = ?, time = ?, status = 'Rescheduled' WHERE id = ?",
            [mysqlDate, time, id]
        );

        if (result.affectedRows === 0) {
            throw new Error("Booking not found");
        }

        return { success: true };
    } catch (error) {
        console.error("Error rescheduling booking:", error);
        throw error;
    }
}

// ✅ NEW: Delete booking
export async function deleteBooking(id) {
    if (!id) {
        throw new Error("Missing booking ID");
    }

    try {
        const [result] = await db.promise().query(
            "DELETE FROM bookings WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            throw new Error("Booking not found");
        }

        return { success: true };
    } catch (error) {
        console.error("Error deleting booking:", error);
        throw error;
    }
}

// ✅ NEW: Get booking by ID
export async function getBookingById(id) {
    try {
        const [rows] = await db.promise().query(
            "SELECT * FROM bookings WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            throw new Error("Booking not found");
        }

        return rows[0];
    } catch (error) {
        console.error("Error getting booking:", error);
        throw error;
    }
}

// ✅ NEW: Search bookings
export async function searchBookings(searchTerm) {
    try {
        const [rows] = await db.promise().query(
            `SELECT * FROM bookings 
             WHERE name LIKE ? OR phone LIKE ? OR problem LIKE ? OR status LIKE ?
             ORDER BY created_at DESC`,
            [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
        );

        return rows;
    } catch (error) {
        console.error("Error searching bookings:", error);
        throw error;
    }
}

// ✅ NEW: Get bookings by status
export async function getBookingsByStatus(status) {
    const validStatuses = ["Pending", "Scheduled", "Completed", "Cancelled", "Rescheduled"];

    if (!validStatuses.includes(status)) {
        throw new Error("Invalid status value");
    }

    try {
        const [rows] = await db.promise().query(
            "SELECT * FROM bookings WHERE status = ? ORDER BY created_at DESC",
            [status]
        );

        return rows;
    } catch (error) {
        console.error("Error getting bookings by status:", error);
        throw error;
    }
}

// ✅ NEW: Get booking statistics
export async function getBookingStats() {
    try {
        const [stats] = await db.promise().query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'Scheduled' THEN 1 ELSE 0 END) as scheduled,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN status = 'Rescheduled' THEN 1 ELSE 0 END) as rescheduled
            FROM bookings
        `);

        return stats[0];
    } catch (error) {
        console.error("Error getting booking stats:", error);
        throw error;
    }
}

// ✅ Optional: Format date back to dd/MM/yyyy for frontend
export function formatDateForFrontend(dateStr) {
    if (!dateStr) return '';

    // If date is in yyyy-MM-dd format, convert to dd/MM/yyyy
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }

    // If date is a Date object
    if (dateStr instanceof Date) {
        const day = String(dateStr.getDate()).padStart(2, '0');
        const month = String(dateStr.getMonth() + 1).padStart(2, '0');
        const year = dateStr.getFullYear();
        return `${day}/${month}/${year}`;
    }

    return dateStr; // Return as is if already in dd/MM/yyyy
}

// ✅ Optional: Get all bookings with formatted dates for frontend
export async function getAllBookingsFormatted() {
    try {
        const bookings = await getAllBookings();

        // Format dates to dd/MM/yyyy for frontend
        return bookings.map(booking => ({
            ...booking,
            date: formatDateForFrontend(booking.date)
        }));
    } catch (error) {
        console.error("Error getting formatted bookings:", error);
        throw error;
    }
}