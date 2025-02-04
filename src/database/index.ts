import { Database } from 'bun:sqlite';
import { config } from '../config';
import {
    EMOJI_SUCCESS,
    EMOJI_ERROR,
    type Subforum,
    type Thread,
    type Post
} from '../types/types';

let db: Database;

function initializeDb() {
    db = new Database(config.DATABASE_PATH, { create: true, readwrite: true });
}

function validateTables(): boolean {
    const tables = ['subforums', 'threads', 'posts'];
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
    initializeDb();

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
        const stmt = db.prepare("INSERT INTO subforums (title, url) VALUES (?, ?)");
        stmt.run(title, url);
        console.log(`${EMOJI_SUCCESS} Subforum inserted: ${title}`);
    } catch (error) {
        console.error(`${EMOJI_ERROR} Failed to insert subforum:`, error);
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
            "INSERT INTO threads (subforum_url, title, url, creator, created_at) VALUES (?, ?, ?, ?, ?)"
        );
        stmt.run(subforumUrl, title, url, creator, createdAt);
        console.log(`${EMOJI_SUCCESS} Thread inserted: ${title} (${createdAt})`);
    } catch (error) {
        console.error(`${EMOJI_ERROR} Failed to insert thread:`, error);
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
            "INSERT INTO posts (thread_url, username, comment, posted_at) VALUES (?, ?, ?, ?)"
        );
        stmt.run(threadUrl, username, comment, postedAt);
        console.log(`${EMOJI_SUCCESS} Post inserted from ${username} (${postedAt})`);
    } catch (error) {
        console.error(`${EMOJI_ERROR} Failed to insert post:`, error);
        throw error;
    }
}

export function closeDatabase(): void {
    if (db) {
        db.close();
        console.log(`${EMOJI_SUCCESS} Database connection closed.`);
    }
}
