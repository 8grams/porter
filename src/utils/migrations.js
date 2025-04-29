import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/porter.sqlite');

async function runMigrations() {
  try {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Open database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Create migrations table first
    await db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get all migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    // Get executed migrations
    const executedMigrations = await db.all('SELECT name FROM migrations');
    const executedNames = new Set(executedMigrations.map(m => m.name));

    // Run pending migrations
    for (const file of migrationFiles) {
      if (!executedNames.has(file)) {
        console.log(`Running migration: ${file}`);
        const migrationPath = path.join(migrationsDir, file);
        const migration = await import(migrationPath);
        
        // Execute the up function from the migration
        await migration.up(db);
        
        // Record the migration as executed
        await db.run('INSERT INTO migrations (name) VALUES (?)', file);
        console.log(`✅ Completed: ${file}`);
      } else {
        console.log(`⏭️ Skipping already executed migration: ${file}`);
      }
    }

    console.log('✨ All migrations completed successfully!');
    await db.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations(); 