import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import router from "./routes/routes.js";
import { startWhatsApp } from "./whatsapp/client.js";

dotenv.config();

const app = express();
// Middlewares
app.use(cors({
    origin: "",
    credentials: true
}));

app.use(morgan("dev"));
app.use(helmet());
app.use(express.json());

// Test route

startWhatsApp();

app.use("/api", router)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
