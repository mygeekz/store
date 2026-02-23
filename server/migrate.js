// فایل: server/migrate.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'kourosh_inventory.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        return console.error('Could not connect to database', err.message);
    }
    console.log('Connected to the SQLite database.');
});

db.serialize(() => {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS installment_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        installment_payment_id INTEGER NOT NULL,
        amount_paid REAL NOT NULL,
        payment_date TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (installment_payment_id) REFERENCES installment_payments(id) ON DELETE CASCADE
      );
    `;

    db.run(createTableSql, (err) => {
        if (err) {
            return console.error('Error creating installment_transactions table', err.message);
        }
        console.log("Table 'installment_transactions' checked/created successfully.");
    });
});

db.close((err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Closed the database connection.');
});