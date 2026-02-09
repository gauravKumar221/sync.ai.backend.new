import express from "express";
import {
    register,
    login,
    getAllBookings,
    createBooking,

    getProfile,
    updateProfile,
    getBookingByIdController,
    updateBookingStatusController,
    updateBookingDetailsController,
    rescheduleBookingController,
    deleteBookingController,
    searchBookingsController,
    getBookingsByStatusController,
    getBookingStatsController,
    parseWhatsAppMessage,
    forgotPassword,
    verifyOTP,
    resetPassword,
    changePassword,
    updatePassword,
    verifyAndResetPassword
} from "../controllers/controllers.js";
import { verifytoken } from "../middleware/auth.js";

import { otpRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Auth routes
router.post("/register", register);
router.post("/login", login);

// User routes
router.get("/profile", verifytoken, getProfile);
router.put("/update-profile", verifytoken, updateProfile);


// Password routes
router.post("/forgot-password", otpRateLimiter, forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);
router.post("/change-password", verifytoken, changePassword); // Same as update-password
router.put("/update-password", verifytoken, updatePassword);
router.post("/verify-reset-password", verifyAndResetPassword);

// Booking routes
router.get("/showallbookings", verifytoken, getAllBookings);
router.post("/bookings", verifytoken, createBooking);
router.get("/bookings/:id", verifytoken, getBookingByIdController);
router.put("/bookings/:id/status", verifytoken, updateBookingStatusController);
router.put("/bookings/:id/details", verifytoken, updateBookingDetailsController);
router.put("/bookings/:id/reschedule", verifytoken, rescheduleBookingController);
router.delete("/bookings/:id", verifytoken, deleteBookingController);
router.get("/bookings/search", verifytoken, searchBookingsController);
router.get("/bookings/status/:status", verifytoken, getBookingsByStatusController);
router.get("/bookings/stats", verifytoken, getBookingStatsController);

// WhatsApp bot route
router.post("/parse-whatsapp", parseWhatsAppMessage);

export default router;