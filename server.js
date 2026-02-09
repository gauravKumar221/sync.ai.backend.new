import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

import { startWhatsApp } from "./whatsapp/client.js";
import router from "./routes/routes.js";

dotenv.config();

const app = express();

// 🔥 CORS must be ENABLED
app.use(cors({
    origin: true,      // allow all localhost ports in dev
    credentials: true
}));

app.use(morgan("dev"));
app.use(helmet());
app.use(express.json());

// startWhatsApp();

app.use("/api", router);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
