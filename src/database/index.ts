import { Database } from 'bun:sqlite';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { existsSync } from 'fs';
import { config } from '../config';
import { unlink } from 'fs/promises';
import {
    EMOJI_SUCCESS,
    EMOJI_ERROR,
    EMOJI_INFO,
    type Subforum,
    type Thread,
    type Post
} from '../types/types';

let db: Database;

export async function initialiseDatabase(): Promise<void> {
    if (existsSync(config.DATABASE_PATH)) {
        const rl = readline.createInterface({ input, output });

        try {
            const answer = await rl.question('Database exists. Delete and recreate? (y/N) ');

            if (answer.trim().toLowerCase() === 'y') {
                await unlink(config.DATABASE_PATH);
                console.log(`${EMOJI_SUCCESS} Database reset.`);
            } else {
                console.log(`${EMOJI_INFO} Using existing database.`);
                process.exit(0);
            }
        } finally {
            rl.close();
        }
    }

    setupDatabase();
}

function initialiseDb() {
    db = new Database(config.DATABASE_PATH, { create: true, readwrite: true });
}

function validateTables(): boolean {
    const tables = ['subforums', 'threads', 'posts', 'users'];
    const existingTables = db.query("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const existingTableNames = new Set(existingTables.map(t => t.name));

    const missingTables = tables.filter(table => !existingTableNames.has(table));

    if (missingTables.length > 0) {
        console.error(`${EMOJI_ERROR} Missing required tables: ${missingTables.join(', ')}`);
        return false;
    }

    console.log(`${EMOJI_SUCCESS} Database tables validated.`);
    return true;
}

export function setupDatabase(): void {
    initialiseDb();

    try {
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
                creator TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                thread_url TEXT NOT NULL,
                username TEXT NOT NULL,
                comment TEXT NOT NULL,
                posted_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                first_seen TEXT NOT NULL,
                post_count INTEGER DEFAULT 1
            );
        `);
        console.log(`${EMOJI_SUCCESS} Database setup completed.`);

        const tablesExist = validateTables();
        if (!tablesExist) {
            console.error(`${EMOJI_ERROR} Database setup failed - tables not created properly`);
            closeDatabase();
            process.exit(1);
        }
    } catch (error) {
        console.error(`${EMOJI_ERROR} Failed to setup database:`, error);
        closeDatabase();
        process.exit(1);
    }
}

export function getSubforums(): Subforum[] {
    const stmt = db.prepare("SELECT id, title, url FROM subforums");
    const subforums = stmt.all() as Subforum[];

    subforums.forEach((subforum) => {
        console.log(`${EMOJI_SUCCESS} Subforum loaded: ${subforum.title}`);
    });
    return subforums;
}

export function getThreadsBySubforum(subforumUrl: string): Thread[] {
    const stmt = db.prepare(
        "SELECT id, subforum_url, title, url, creator, created_at FROM threads WHERE subforum_url = ?"
    );
    const threads = stmt.all(subforumUrl) as Thread[];

    threads.forEach((thread) => {
        console.log(`${EMOJI_SUCCESS} Thread loaded: ${thread.title}`);
    });
    return threads;
}

export function getPostsByThread(threadUrl: string): Post[] {
    const stmt = db.prepare(
        "SELECT id, thread_url, username, comment, posted_at FROM posts WHERE thread_url = ? ORDER BY posted_at ASC"
    );
    const posts = stmt.all(threadUrl) as Post[];

    posts.forEach((post) => {
        console.log(`${EMOJI_SUCCESS} Post loaded from ${post.username}`);
    });
    return posts;
}

export function insertSubforum(title: string, url: string): void {
    try {
        const stmt = db.prepare("INSERT OR IGNORE INTO subforums (title, url) VALUES (?, ?)");
        stmt.run(title, url);
        console.log(`${EMOJI_SUCCESS} Subforum processed: ${title}`);
    } catch (error) {
        console.error(`${EMOJI_ERROR} Failed to process subforum:`, error);
        throw error;
    }
}

export function insertThread(
    subforumUrl: string,
    title: string,
    url: string,
    creator: string,
    createdAt: string
): void {
    try {
        const stmt = db.prepare(
            "INSERT OR IGNORE INTO threads (subforum_url, title, url, creator, created_at) VALUES (?, ?, ?, ?, ?)"
        );
        stmt.run(subforumUrl, title, url, creator, createdAt);
        console.log(`${EMOJI_SUCCESS} Thread processed: ${title} (${createdAt})`);
    } catch (error) {
        console.error(`${EMOJI_ERROR} Failed to process thread:`, error);
        throw error;
    }
}

export function insertPost(
    threadUrl: string,
    username: string,
    comment: string,
    postedAt: string
): void {
    try {
        const stmt = db.prepare(
            "INSERT OR IGNORE INTO posts (thread_url, username, comment, posted_at) VALUES (?, ?, ?, ?)"
        );
        stmt.run(threadUrl, username, comment, postedAt);
        trackUser(username, postedAt);
        console.log(`${EMOJI_SUCCESS} Post processed from ${username} (${postedAt})`);
    } catch (error) {
        console.error(`${EMOJI_ERROR} Failed to process post:`, error);
        throw error;
    }
}

export function trackUser(username: string, postedAt: string): void {
    try {
        const stmt = db.prepare(`
            INSERT INTO users (username, first_seen, post_count)
            VALUES (?, ?, 1)
            ON CONFLICT(username) DO UPDATE SET
            post_count = post_count + 1
        `);
        stmt.run(username, postedAt);
    } catch (error) {
        console.error(`${EMOJI_ERROR} Failed to track user:`, error);
        throw error;
    }
}

export function getUserCount(): number {
    return (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;
}

export function closeDatabase(): void {
    if (db) {
        db.close();
        console.log(`${EMOJI_SUCCESS} Database connection closed.`);
    }
}
