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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paystack_status TEXT,
    paid_at DATETIME,
    payment_verified_at DATETIME,
    receipt_sent_at DATETIME,
    delivery_method TEXT DEFAULT 'ship', pickup_info TEXT, delivery_fee REAL DEFAULT 0,
    lagos_area TEXT, discount_amount REAL DEFAULT 0, payment_reference TEXT,
    paystack_transaction_id TEXT, amount_paid REAL, payment_channel TEXT, currency TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    product_name TEXT,
    qty INTEGER,
    price REAL,
    image TEXT, product_id TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(order_id)
  );`,
  `CREATE TABLE IF NOT EXISTS payment_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, reference TEXT UNIQUE NOT NULL,
    paystack_transaction_id TEXT, amount REAL NOT NULL, currency TEXT, status TEXT NOT NULL,
    channel TEXT, paid_at DATETIME, raw_data TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    const columns = await db.execute("PRAGMA table_info(orders)");
    const existing = new Set(columns.rows.map((row) => row.name));
    for (const [name, type] of [["paystack_status", "TEXT"], ["paid_at", "DATETIME"], ["payment_verified_at", "DATETIME"], ["receipt_sent_at", "DATETIME"], ["delivery_method", "TEXT DEFAULT 'ship'"], ["pickup_info", "TEXT"], ["delivery_fee", "REAL DEFAULT 0"], ["lagos_area", "TEXT"], ["discount_amount", "REAL DEFAULT 0"], ["payment_reference", "TEXT"], ["paystack_transaction_id", "TEXT"], ["amount_paid", "REAL"], ["payment_channel", "TEXT"], ["currency", "TEXT"]]) {
      if (!existing.has(name)) await db.execute(`ALTER TABLE orders ADD COLUMN ${name} ${type}`);
    }
    const itemColumns = await db.execute("PRAGMA table_info(order_items)");
    if (!new Set(itemColumns.rows.map((row) => row.name)).has("product_id")) await db.execute("ALTER TABLE order_items ADD COLUMN product_id TEXT");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(paystack_status, status, created_at)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)");
    console.log("✅ Tables created successfully in Turso!");
  } catch (err) {
    console.error("❌ Error initializing database:", err);
  }
}

export const ready = setup();
