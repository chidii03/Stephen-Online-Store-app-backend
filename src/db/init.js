import db from './database.js';

const schema = [
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT UNIQUE NOT NULL, 
    reference TEXT UNIQUE,          
    customer_name TEXT, 
    email TEXT, 
    phone TEXT, 
    address TEXT,
    state TEXT,
    total_amount REAL,
    status TEXT DEFAULT 'PENDING', 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    product_name TEXT,
    qty INTEGER,
    price REAL,
    image TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(order_id)
  );`,
  `CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`
];

async function setup() {
  try {
    console.log("Connecting to Turso...");
    for (const statement of schema) {
      await db.execute(statement);
    }
    console.log("✅ Tables created successfully in Turso!");
  } catch (err) {
    console.error("❌ Error initializing database:", err);
  }
}

setup();