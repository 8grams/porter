export async function up(db) {
  await db.exec(`
    CREATE TABLE shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL,
      share_to INTEGER NOT NULL,
      rotation_period TEXT,
      expired_at DATETIME,
      next_rotation DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function down(db) {
  await db.exec('DROP TABLE shares');
} 