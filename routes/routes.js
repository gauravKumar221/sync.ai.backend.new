import express from "express";

import { register, login, getAllBookings, createBooking } from "../controllers/controllers.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/bookings", getAllBookings);
router.post("/bookings", createBooking);
export default router;
