import db from "../config/db.js";

const createUsersTable =
    `CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
db.query(createUsersTable, (error) => {
    if (error) {
        console.log(
            "usertable is not create", error
        );
    } else {
        console.log("usertable is create");
    }
})