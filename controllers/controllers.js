import db from "../config/db.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { saveBooking } from "../services/booking.service.js";

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

export const updatePassword = async (req, res) => {


    try {
        // 1️⃣ Validation password first gaurav
        const { updatePassword, newPassword } = req.body;
        if (!updatePassword || !newPassword) {
            return res.status(400).json({ message: "All fields are required" })
        }

        // 2️⃣ Get existing password

        const [rows] = await db.promise().query("SELECT password FROM users WHERE id = ?",
            [req.user.id]
        );
        const user = rows[0];

        // 3️⃣ Verify current password

        const isMatchPassword = await bcrypt.compare(updatePassword, user.password);
        if (!isMatchPassword) {
            return res.status(400).json({ message: "Invalid current password" })
        }

        // 4️⃣ Update password

        const hassedPassword = await bcrypt.hash(newPassword, 10);


        await db.promise().query("UPDATE users SET password = ? WHERE id = ?", [hassedPassword, req.user.id]);
        return res.status(200).json({ message: "Password updated successfully" })


    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }




}





















// whatsapp

export const createBooking = async (req, res) => {
    try {
        const bookingData = req.body; // Assuming data comes from WhatsApp webhook or a direct API call

        // Save the booking using the service
        const result = await saveBooking(bookingData);

        if (result.success) {
            res.status(201).json({ message: "Booking saved successfully" });
        } else {
            res.status(400).json({ message: result.message });
        }
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getAllBookings = async (req, res) => {
    try {
        res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");

        const [rows] = await db
            .promise()
            .query("SELECT * FROM bookings ORDER BY id DESC");
        return res.status(200).json(rows);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to fetch bookings" });
    }
};
