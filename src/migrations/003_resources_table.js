export async function up(db) {
  await db.exec(`
    CREATE TABLE resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL UNIQUE,
      username TEXT,
      password TEXT,
      host TEXT,
      value TEXT,
      keyID TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function down(db) {
  await db.exec("DROP TABLE resources");
}
