import db from "../config/db.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { sendEmail } from '../config/emailConfig.js';
import {
    parseBookingMessage,
    saveBooking,
    findBookingByPhone,
    getAllBookings as getAllBookingsService,
    createBooking as createBookingService,
    updateBookingStatus,
    updateBookingDetails,
    rescheduleBooking,
    deleteBooking,
    getBookingById,
    searchBookings,
    getBookingsByStatus,
    getBookingStats
} from "../services/booking.service.js";

dotenv.config();

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        // check the email ys or not

        const [existingUser] = await db
            .promise()
            .query("SELECT * FROM users WHERE email = ?", [email]);
        if (existingUser.length > 0) {
            return res.status(409).json({ message: "User already exists" });
        }
        // hash the password

        const hassedPassword = await bcrypt.hash(password, 10);

        await db
            .promise()
            .query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [
                name,
                email,
                hassedPassword,
            ]);

        return res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// login user

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const [existingUser] = await db
            .promise()
            .query("SELECT * FROM users WHERE email = ?", [email]);
        if (existingUser.length === 0) {
            return res.status(400).json({ message: "User does not exist" });
        }
        const user = existingUser[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN,
        });

        return res.status(200).json({
            message: "User logged in successfully",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// getprofile user

export const getProfile = async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            `SELECT id, name, email, phone, location, city, address 
       FROM users WHERE id = ?`,
            [req.user.id]
        );

        return res.status(200).json({
            message: "User profile fetched successfully",
            user: rows[0],
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to load profile" });
    }
};


// update profile

export const updateProfile = async (req, res) => {
    try {
        const { name, phone, location, city, address } = req.body;
        const userId = req.user.id;

        await db.promise().query(
            `UPDATE users 
       SET name = ?, phone = ?, location = ?, city = ?, address = ?
       WHERE id = ?`,
            [name, phone, location, city, address, userId]
        );

        // Fetch updated user
        const [rows] = await db.promise().query(
            `SELECT id, name, email, phone, location, city, address
       FROM users WHERE id = ?`,
            [userId]
        );

        return res.status(200).json({
            message: "Profile updated successfully",
            user: rows[0],
        });
    } catch (error) {
        console.error("UPDATE PROFILE ERROR:", error);
        return res.status(500).json({ message: "Profile update failed" });
    }
};

// update password





// Password-related controllers

// Update Password (for logged-in users)
export const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long"
            });
        }

        // Get user's current password
        const [userRows] = await db.promise().query(
            "SELECT password FROM users WHERE id = ?",
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = userRows[0];

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in database
        await db.promise().query(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, userId]
        );

        return res.status(200).json({
            message: "Password updated successfully"
        });

    } catch (error) {
        console.error("Update password error:", error);
        return res.status(500).json({ message: "Failed to update password" });
    }
};






export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        console.log(`📧 Forgot password request for: ${email}`);

        // Check if user exists
        const [userRows] = await db.promise().query(
            "SELECT id, name, email FROM users WHERE email = ?",
            [email]
        );

        if (userRows.length === 0) {
            console.log(`❌ User not found: ${email}`);
            return res.status(200).json({
                success: true,
                message: "If an account exists with this email, you will receive an OTP shortly"
            });
        }

        const user = userRows[0];

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        console.log(`📱 OTP for ${email}: ${otp}`);
        console.log(`⏰ Expires: ${otpExpiresAt}`);

        // Store OTP in database
        try {
            const [result] = await db.promise().query(
                `INSERT INTO otp_logs (user_id, email, otp, expires_at, is_used) 
                 VALUES (?, ?, ?, ?, FALSE)`,
                [user.id, email, otp, otpExpiresAt]
            );

            console.log(`✅ OTP saved to DB. ID: ${result.insertId}`);

        } catch (dbError) {
            console.error("❌ DB error:", dbError);
            req.app.locals.otps = req.app.locals.otps || {};
            req.app.locals.otps[email] = {
                otp,
                expiresAt: otpExpiresAt,
                userId: user.id
            };
            console.log(`📝 OTP saved to memory`);
        }

        // Send OTP via Email
        try {
            console.log(`📧 Sending email to: ${email}`);

            await sendEmail(
                email,
                'forgotPasswordOTP',
                {
                    otp,
                    name: user.name || user.email.split('@')[0]
                }
            );

            console.log(`✅ Email sent successfully`);

            return res.status(200).json({
                success: true,
                message: "OTP sent to your email",
                // For testing
                testOtp: otp
            });

        } catch (emailError) {
            console.error("❌ Email error:", emailError.message);

            return res.status(200).json({
                success: true,
                message: "OTP generated (check console)",
                testOtp: otp,
                emailSent: false
            });
        }

    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        console.log(`🔍 Verifying OTP for: ${email}`);
        console.log(`   OTP entered: ${otp}`);

        let isValid = false;
        let userId = null;

        try {
            // Check database
            const [otpRows] = await db.promise().query(`
                SELECT user_id, expires_at, is_used 
                FROM otp_logs 
                WHERE email = ? AND otp = ? AND is_used = FALSE 
                ORDER BY created_at DESC LIMIT 1
            `, [email, otp]);

            console.log(`   Found ${otpRows.length} matching OTPs in DB`);

            if (otpRows.length > 0) {
                const otpRecord = otpRows[0];
                const now = new Date();
                const expiresAt = new Date(otpRecord.expires_at);

                console.log(`   Now: ${now.toISOString()}`);
                console.log(`   Expires: ${expiresAt.toISOString()}`);

                if (now < expiresAt) {
                    isValid = true;
                    userId = otpRecord.user_id;

                    console.log(`✅ OTP valid! User ID: ${userId}`);

                    // Mark OTP as used
                    await db.promise().query(
                        "UPDATE otp_logs SET is_used = TRUE WHERE email = ? AND otp = ?",
                        [email, otp]
                    );
                    console.log(`   OTP marked as used`);
                } else {
                    console.log(`❌ OTP expired`);
                }
            } else {
                console.log(`❌ No matching unused OTP found`);
            }

        } catch (dbError) {
            console.error("Database error:", dbError);
            // Check memory
            const storedOTP = req.app.locals.otps?.[email];
            if (storedOTP && storedOTP.otp === otp && new Date() < storedOTP.expiresAt) {
                isValid = true;
                userId = storedOTP.userId;
                delete req.app.locals.otps[email];
                console.log(`✅ Memory OTP valid!`);
            }
        }

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }

        // Generate a reset token
        const resetToken = jwt.sign(
            { userId, email, purpose: 'password_reset' },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            userId: userId,
            resetToken: resetToken
        });

    } catch (error) {
        console.error("Verify OTP error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// Alternative resetPassword that accepts OTP + email directly
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword, confirmPassword } = req.body;

        console.log('🔑 Reset password request received');
        console.log('Email:', email);
        console.log('OTP:', otp ? 'Provided' : 'Missing');
        console.log('New password:', newPassword ? 'Provided' : 'Missing');
        console.log('Confirm password:', confirmPassword ? 'Provided' : 'Missing');

        // Validate inputs
        if (!email || !otp || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Email, OTP, new password, and confirm password are required"
            });
        }

        // Check password match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        // Check password strength
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        // Verify OTP first
        let userId = null;
        let isValid = false;

        try {
            // Check OTP in database
            const [otpRows] = await db.promise().query(`
                SELECT user_id, expires_at, is_used 
                FROM otp_logs 
                WHERE email = ? AND otp = ? AND is_used = FALSE 
                ORDER BY created_at DESC LIMIT 1
            `, [email, otp]);

            if (otpRows.length > 0) {
                const otpRecord = otpRows[0];
                const now = new Date();
                const expiresAt = new Date(otpRecord.expires_at);

                if (now < expiresAt) {
                    isValid = true;
                    userId = otpRecord.user_id;

                    // Mark OTP as used
                    await db.promise().query(
                        "UPDATE otp_logs SET is_used = TRUE WHERE email = ? AND otp = ?",
                        [email, otp]
                    );
                    console.log(`✅ OTP verified for user ID: ${userId}`);
                }
            }
        } catch (dbError) {
            console.error("Database error:", dbError);
        }

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        console.log('✅ Password hashed');

        // Update password in database
        const [updateResult] = await db.promise().query(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, userId]
        );

        console.log(`✅ Password updated. Affected rows: ${updateResult.affectedRows}`);

        // Get user details for email
        const [userRows] = await db.promise().query(
            "SELECT name, email FROM users WHERE id = ?",
            [userId]
        );

        // Send success email
        if (userRows.length > 0) {
            try {
                const { sendEmail } = await import('../config/emailConfig.js');
                await sendEmail(
                    email,
                    'passwordResetSuccess',
                    {
                        name: userRows[0].name || email.split('@')[0]
                    }
                );
                console.log(`✅ Success email sent to ${email}`);
            } catch (emailError) {
                console.error('⚠️ Failed to send success email:', emailError.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Password reset successful! You can now login with your new password."
        });

    } catch (error) {
        console.error("❌ Reset password error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reset password. Please try again."
        });
    }
};


// Add this to your authController.js
export const verifyAndResetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword, confirmPassword } = req.body;

        console.log('🔄 Verify and reset password request');

        // Validate inputs
        if (!email || !otp || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Check passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        // Find user
        const [userRows] = await db.promise().query(
            "SELECT id, name, email FROM users WHERE email = ?",
            [email]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = userRows[0];

        // Verify OTP
        const [otpRows] = await db.promise().query(`
            SELECT user_id, expires_at, is_used 
            FROM otp_logs 
            WHERE email = ? AND otp = ? AND is_used = FALSE 
            ORDER BY created_at DESC LIMIT 1
        `, [email, otp]);

        if (otpRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        const otpRecord = otpRows[0];
        const now = new Date();
        const expiresAt = new Date(otpRecord.expires_at);

        if (now >= expiresAt) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired"
            });
        }

        // Mark OTP as used
        await db.promise().query(
            "UPDATE otp_logs SET is_used = TRUE WHERE email = ? AND otp = ?",
            [email, otp]
        );

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await db.promise().query(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, user.id]
        );

        // Send success email
        try {
            const { sendEmail } = await import('../config/emailConfig.js');
            await sendEmail(
                email,
                'passwordResetSuccess',
                {
                    name: user.name || email.split('@')[0]
                }
            );
        } catch (emailError) {
            console.error("Email error:", emailError.message);
        }

        return res.status(200).json({
            success: true,
            message: "Password reset successfully! You can now login."
        });

    } catch (error) {
        console.error("Verify and reset error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reset password"
        });
    }
};







// Change Password (alternative name for updatePassword)
export const changePassword = async (req, res) => {
    return updatePassword(req, res);
};

// heare


// Get all bookings
export const getAllBookings = async (req, res) => {
    try {
        const bookings = await getAllBookingsService();
        res.json({ bookings });
    } catch (error) {
        console.error("Get bookings error:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
};

// Create booking
export const createBooking = async (req, res) => {
    try {
        const result = await createBookingService(req.body);
        res.status(201).json({
            message: "Booking created successfully",
            bookingId: result.bookingId
        });
    } catch (error) {
        console.error("Create booking error:", error);
        res.status(400).json({ error: error.message || "Internal server error" });
    }
};

// Get booking by ID
export const getBookingByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await getBookingById(id);
        res.json({ booking });
    } catch (error) {
        console.error("Get booking by ID error:", error);
        res.status(404).json({ error: error.message || "Internal server error" });
    }
};

// Update booking status
export const updateBookingStatusController = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await updateBookingStatus(id, status);
        res.json({ message: "Status updated successfully" });
    } catch (error) {
        console.error("Update status error:", error);
        res.status(400).json({ error: error.message || "Internal server error" });
    }
};

// Update booking details
export const updateBookingDetailsController = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        await updateBookingDetails(id, updates);
        res.json({ message: "Booking updated successfully" });
    } catch (error) {
        console.error("Update booking error:", error);
        res.status(400).json({ error: error.message || "Internal server error" });
    }
};

// Reschedule booking
export const rescheduleBookingController = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, time } = req.body;

        await rescheduleBooking(id, date, time);
        res.json({ message: "Booking rescheduled successfully" });
    } catch (error) {
        console.error("Reschedule error:", error);
        res.status(400).json({ error: error.message || "Internal server error" });
    }
};

// Delete booking
export const deleteBookingController = async (req, res) => {
    try {
        const { id } = req.params;

        await deleteBooking(id);
        res.json({ message: "Booking deleted successfully" });
    } catch (error) {
        console.error("Delete booking error:", error);
        res.status(400).json({ error: error.message || "Internal server error" });
    }
};

// Search bookings
export const searchBookingsController = async (req, res) => {
    try {
        const { q } = req.query;
        const bookings = await searchBookings(q || "");
        res.json({ bookings });
    } catch (error) {
        console.error("Search bookings error:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
};

// Get bookings by status
export const getBookingsByStatusController = async (req, res) => {
    try {
        const { status } = req.params;
        const bookings = await getBookingsByStatus(status);
        res.json({ bookings });
    } catch (error) {
        console.error("Get bookings by status error:", error);
        res.status(400).json({ error: error.message || "Internal server error" });
    }
};

// Get booking statistics
export const getBookingStatsController = async (req, res) => {
    try {
        const stats = await getBookingStats();
        res.json({ stats });
    } catch (error) {
        console.error("Get booking stats error:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
};

// Parse WhatsApp message (for WhatsApp bot)
export const parseWhatsAppMessage = async (req, res) => {
    try {
        const { text } = req.body;
        const bookingData = parseBookingMessage(text);

        if (!bookingData.name || !bookingData.phone) {
            return res.status(400).json({
                error: "Could not extract name and phone from message"
            });
        }

        // Check if booking already exists
        const existing = await findBookingByPhone(bookingData.phone);
        if (existing) {
            return res.json({
                message: "Booking already exists",
                booking: existing
            });
        }

        // Save new booking
        const result = await saveBooking(bookingData);
        res.status(201).json(result);
    } catch (error) {
        console.error("Parse WhatsApp message error:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
};