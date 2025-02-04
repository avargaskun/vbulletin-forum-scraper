import { Database } from "bun:sqlite";
import * as dotenv from "dotenv";

dotenv.config();

const DATABASE_PATH = process.env.DATABASE_PATH || "data/forum_data.db";
const db = new Database(DATABASE_PATH);

export function setupDatabase(): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS subforums (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS threads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subforum_url TEXT NOT NULL,
            title TEXT NOT NULL,
            url TEXT UNIQUE NOT NULL,
            creator TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_url TEXT NOT NULL,
            username TEXT NOT NULL,
            comment TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL
        );
    `);
}

export function insertSubforum(title: string, url: string): void {
    db.run("INSERT OR IGNORE INTO subforums (title, url) VALUES (?, ?)", [title, url]);
}

export function insertThread(subforumUrl: string, title: string, url: string, creator: string): void {
    db.run("INSERT OR IGNORE INTO threads (subforum_url, title, url, creator) VALUES (?, ?, ?, ?)",
           [subforumUrl, title, url, creator]);
}

export function insertPost(threadUrl: string, username: string, comment: string): void {
    db.run("INSERT INTO posts (thread_url, username, comment) VALUES (?, ?, ?)", [threadUrl, username, comment]);
}

export function getSubforums(): { url: string }[] {
    return db.query<{ url: string }, []>("SELECT url FROM subforums").all();
}


export function closeDatabase(): void {
    db.close();
}
