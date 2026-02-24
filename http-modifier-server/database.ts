import { Database } from "bun:sqlite";

const DBSOURCE = "db.sqlite";

const db = new Database(DBSOURCE);

console.log("Connected to the SQLite database.");

db.run(`CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE, 
    password TEXT, 
    token TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    rules_json TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES user(id)
)`);

export interface User {
  id: number;
  email: string;
  password: string;
  token: string | null;
}

export interface Rule {
  id: number;
  user_id: number;
  rules_json: string;
  updated_at: string;
}

export default db;
