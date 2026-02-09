import db from "../config/db.js";

const createUsersTable = `CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  location VARCHAR(100),
  phone VARCHAR(20),
  city VARCHAR(50),
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
db.query(createUsersTable, (error) => {
    if (error) {
        console.log("usertable is not create", error);
    } else {
        console.log("usertable is create");
    }
});

const createBookingsTable = `
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  problem TEXT NOT NULL,
  date DATE NOT NULL,  
  time TIME NOT NULL,  
  status ENUM('Pending', 'Scheduled', 'Completed', 'Cancelled', 'Rescheduled') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  INDEX idx_status (status)
);
`;

db.query(createBookingsTable, (error) => {
    if (error) {
        console.log("Booking table creation failed:", error);
    } else {
        console.log("Booking table created successfully");
    }
});
