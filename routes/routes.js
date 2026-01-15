import express from "express";

import { register, login, getAllBookings, createBooking, updatePassword, getProfile, updateProfile } from "../controllers/controllers.js";
import { verifytoken } from "../middleware/auth.js";
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/showallbookings", verifytoken, getAllBookings);
router.post("/bookings", verifytoken, createBooking);
router.put("/update-password", verifytoken, updatePassword);
router.get("/profile", verifytoken, getProfile);
router.put("/update-profile", verifytoken, updateProfile);
export default router;
