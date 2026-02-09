import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306,
});

db.connect((error) => {
    if (error) {
        console.log("❌ Database connection error", error);
    } else {
        console.log("✅ Database connected");
    }
});

export default db;
