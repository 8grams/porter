import sqlite3 from "sqlite3";
import { open } from "sqlite";
import type { Database } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../../data/porter.sqlite");

let dbInstance: Database | null = null;

export async function openDB(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
  }
  return dbInstance;
}
