const db = require('../database/connection');

async function run() {
  console.log('Starting seed script...');
  try {
    // create products table
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_name VARCHAR(255),
        sku VARCHAR(100),
        price DECIMAL(10,2),
        stock INT DEFAULT 0
      ) ENGINE=InnoDB;
    `);

    // create products_sales
    await db.query(`
      CREATE TABLE IF NOT EXISTS products_sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT,
        date DATE,
        sales INT,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // create dashboard_metrics_history
    await db.query(`
      CREATE TABLE IF NOT EXISTS dashboard_metrics_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        metric_id INT,
        date DATE,
        value DOUBLE
      ) ENGINE=InnoDB;
    `);

    // create users table for auth
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        isAdmin TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    // ensure expected columns exist (for older schemas)
    try {
      const [cols] = await db.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'", [process.env.DB_NAME]);
      const existing = (cols || []).map(c => c.COLUMN_NAME);
      const alters = [];
      if (!existing.includes('email')) alters.push("ADD COLUMN email VARCHAR(255) NULL");
      if (!existing.includes('name')) alters.push("ADD COLUMN name VARCHAR(255) NULL");
      if (!existing.includes('phone')) alters.push("ADD COLUMN phone VARCHAR(50) NULL");
      if (!existing.includes('isAdmin')) alters.push("ADD COLUMN isAdmin TINYINT DEFAULT 0");
      if (alters.length > 0) {
        const sql = `ALTER TABLE users ${alters.join(', ')}`;
        await db.query(sql);
      }
    } catch (e) {
      // ignore schema alteration errors
    }

    // insert sample products
    const sampleProducts = [
      ['Blue T-Shirt', 'TSHIRT-BLUE', '19.99', 120],
      ['Red T-Shirt', 'TSHIRT-RED', '19.99', 80],
      ['Green Hoodie', 'HOODIE-GRN', '49.99', 40],
      ['Cap Classic', 'CAP-CLS', '12.50', 200]
    ];
    // clear existing
    await db.query('DELETE FROM products_sales');
    await db.query('DELETE FROM products');
    await db.query('DELETE FROM dashboard_metrics_history');

    for (const p of sampleProducts) {
      const [res] = await db.query('INSERT INTO products (product_name, sku, price, stock) VALUES (?, ?, ?, ?)', p);
      const productId = res.insertId;
      // seed 120 days of sales
      const now = Date.now();
      for (let i = 120; i >= 1; i--) {
        const d = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const sales = Math.max(0, Math.round((Math.random() * 5) + (productId * 2)));
        await db.query('INSERT INTO products_sales (product_id, date, sales) VALUES (?, ?, ?)', [productId, d, sales]);
      }
    }

    // seed dashboard_metrics and history if table exists
    try {
      const [metrics] = await db.query('SELECT * FROM dashboard_metrics LIMIT 1');
      if (!metrics || metrics.length === 0) {
        // try to insert sample metrics if table exists
        await db.query("INSERT IGNORE INTO dashboard_metrics (metric_name, metric_value, target_value, status) VALUES ('Net Profit', 15000, 20000, 'Active'), ('Sales Growth', -1.5, 0, 'Active'), ('Conversion Rate', 1.8, 2, 'Active')");
      }
    } catch (e) {
      // table may not exist; ignore
    }

    console.log('Seed completed.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error', err);
    process.exit(1);
  }
}

run();
