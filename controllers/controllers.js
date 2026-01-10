import db from "../config/db.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { saveBooking } from '../services/booking.service.js';

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
            return res.status(400).json({ message: "User already exists" });
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

        return res
            .status(200)
            .json({ message: "User logged in successfully", token });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


// whatsapp 


// controllers.js


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
        const [rows] = await db.promise().query(
            "SELECT * FROM bookings ORDER BY id DESC"
        );
        return res.status(200).json(rows);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to fetch bookings" });
    }
};
