import Database from 'better-sqlite3'
import { existsSync, unlinkSync } from 'fs'
import { config } from '../config'
import { askQuestion } from '../utils/readline'
import {
  EMOJI_SUCCESS,
  EMOJI_ERROR,
  EMOJI_INFO,
  type Subforum,
  type Thread,
  type Post,
  type File,
  type ScrapingState,
} from '../types/types'
import { logError, logInfo, logWarning } from '../utils/logging'

let db: Database.Database | null = null
const scrapedUrls = new Set<string>()
const downloadedFiles = new Set<string>()

// Database connection and setup functions
export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(config.DATABASE_PATH)
    // Enable WAL and set recommended pragmas for concurrent access
    db.pragma('journal_mode = WAL')
    db.pragma('busy_timeout = 5000')
    db.pragma('synchronous = NORMAL')
  }
  return db
}

function validateTables(): boolean {
  const currentDB = getDatabase()
  const tables = [
    'subforums',
    'threads',
    'posts',
    'users',
    'files',
    'downloaded_files',
    'scraped_urls',
    'scraping_state',
  ]
  const stmt = currentDB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  )
  const existingTables = stmt.all() as { name: string }[]
  const existingTableNames = new Set(existingTables.map((t) => t.name))
  const missingTables = tables.filter((table) => !existingTableNames.has(table))

  if (missingTables.length > 0) {
    logError(
      `${EMOJI_ERROR} Missing required tables: ${missingTables.join(', ')}`
    )
    return false
  }

  logInfo(`${EMOJI_SUCCESS} Database tables validated.`)
  return true
}

export function setupDatabase(): void {
  const currentDB = getDatabase()
  try {
    currentDB.exec(`
            CREATE TABLE IF NOT EXISTS subforums (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                url TEXT UNIQUE NOT NULL,
                parent_id INTEGER,
                FOREIGN KEY (parent_id) REFERENCES subforums(id)
            );
            CREATE TABLE IF NOT EXISTS threads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subforum_url TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT UNIQUE NOT NULL,
                creator TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (subforum_url) REFERENCES subforums(url)
            );
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                thread_url TEXT NOT NULL,
                username TEXT NOT NULL,
                comment TEXT NOT NULL,
                posted_at TEXT NOT NULL,
                user_url TEXT,
                FOREIGN KEY (thread_url) REFERENCES threads(url)
            );
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                first_seen TEXT NOT NULL,
                post_count INTEGER DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                mime_type TEXT,
                file_data BLOB NOT NULL,
                FOREIGN KEY (post_id) REFERENCES posts(id)
            );
            CREATE TABLE IF NOT EXISTS downloaded_files (
                url TEXT PRIMARY KEY,
                post_id INTEGER NOT NULL,
                downloaded_at TEXT NOT NULL,
                FOREIGN KEY (post_id) REFERENCES posts(id)
            );
            CREATE TABLE IF NOT EXISTS scraped_urls (
                url TEXT PRIMARY KEY,
                scraped_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS scraping_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                last_subforum_url TEXT,
                last_thread_url TEXT,
                last_updated TEXT NOT NULL,
                completed BOOLEAN NOT NULL DEFAULT 0
            );

            -- Insert default scraping state if it doesn't exist
            INSERT OR IGNORE INTO scraping_state (id, last_updated, completed)
            VALUES (1, datetime('now'), 0);
        `)
    logInfo(`${EMOJI_SUCCESS} Database setup completed.`)
    if (!validateTables()) {
      throw new Error('Database validation failed')
    }
  } catch (error) {
    logError(`${EMOJI_ERROR} Failed to setup database:`, error as Error)
    closeDatabase()
    process.exit(1)
  }
}

export async function initialiseDatabase(): Promise<void> {
  if (existsSync(config.DATABASE_PATH)) {
    let answer = 'n'
    if (config.TEST_MODE) {
      logWarning(
        `${EMOJI_INFO} TEST_MODE is enabled, automatically resetting database.`
      )
      answer = 'y'
    } else {
      answer = await askQuestion('Database exists. Delete and recreate? (y/N) ')
    }
    if (answer.trim().toLowerCase() === 'y') {
      if (db) {
        db.close()
        db = null
      }
      unlinkSync(config.DATABASE_PATH)
      logWarning(`${EMOJI_SUCCESS} Database reset.`)
      setupDatabase()
    } else {
      logWarning(`${EMOJI_INFO} Using existing database.`)
      getDatabase()
    }
  } else {
    getDatabase()
    setupDatabase()
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    logInfo(`${EMOJI_SUCCESS} Database connection closed.`)
    db = null
  }
}

// Query functions
export function getSubforums(parentId: number | null = null): Subforum[] {
  const currentDB = getDatabase()
  let stmt: Database.Statement
  if (parentId === null) {
    stmt = currentDB.prepare(
      'SELECT id, title, url, parent_id as parentId FROM subforums WHERE parent_id IS NULL'
    )
    return stmt.all() as Subforum[]
  } else {
    stmt = currentDB.prepare(
      'SELECT id, title, url, parent_id as parentId FROM subforums WHERE parent_id = ?'
    )
    return stmt.all(parentId) as Subforum[]
  }
}

export function getThreadsBySubforum(subforumUrl: string): Thread[] {
  const currentDB = getDatabase()
  const stmt = currentDB.prepare(
    'SELECT id, subforum_url as subforumUrl, title, url, creator, created_at as createdAt FROM threads WHERE subforum_url = ?'
  )
  return stmt.all(subforumUrl) as Thread[]
}

export function getPostsByThread(threadUrl: string): Post[] {
  const currentDB = getDatabase()
  const stmt = currentDB.prepare(
    'SELECT id, thread_url as threadUrl, username, comment, posted_at as postedAt, user_url as userUrl FROM posts WHERE thread_url = ? ORDER BY posted_at ASC'
  )
  return stmt.all(threadUrl) as Post[]
}

export function getThreadsCountBySubforum(subforumUrl: string): number {
  const currentDB = getDatabase()
  const stmt = currentDB.prepare(
    'SELECT COUNT(*) as count FROM threads WHERE subforum_url = ?'
  )
  const result = stmt.get(subforumUrl) as { count: number }
  return result.count
}

export function getPostsCountBySubforum(subforumUrl: string): number {
  const currentDB = getDatabase()
  const stmt = currentDB.prepare(`
        SELECT COUNT(*) as count
        FROM posts
        INNER JOIN threads ON posts.thread_url = threads.url
        WHERE threads.subforum_url = ?
    `)
  const result = stmt.get(subforumUrl) as { count: number }
  return result.count
}

export function getUsersCountBySubforum(subforumUrl: string): number {
  const currentDB = getDatabase()
  const stmt = currentDB.prepare(`
        SELECT COUNT(DISTINCT posts.username) as count
        FROM posts
        INNER JOIN threads ON posts.thread_url = threads.url
        WHERE threads.subforum_url = ?
    `)
  const result = stmt.get(subforumUrl) as { count: number }
  return result.count
}

export function getUsersCountByThread(threadUrl: string): number {
  const currentDB = getDatabase()
  const stmt = currentDB.prepare(`
        SELECT COUNT(DISTINCT username) AS count FROM posts WHERE thread_url = ?
    `)
  const result = stmt.get(threadUrl) as { count: number }
  return result.count
}

export function getFilesByPostId(postId: number): File[] {
  const currentDB = getDatabase()
  const stmt = currentDB.prepare(
    'SELECT id, post_id as postId, filename, mime_type as mimeType, file_data as fileData FROM files WHERE post_id = ?'
  )
  return stmt.all(postId) as File[]
}

export function getUserCount(): number {
  const currentDB = getDatabase()
  const result = currentDB
    .prepare('SELECT COUNT(*) as count FROM users')
    .get() as {
    count: number
  }
  return result.count
}

// Insert functions
export function insertSubforum(
  title: string,
  url: string,
  parentId: number | null = null
): Subforum {
  const currentDB = getDatabase()
  try {
    const stmt = currentDB.prepare(
      'INSERT OR IGNORE INTO subforums (title, url, parent_id) VALUES (?, ?, ?)'
    )
    const result = stmt.run(title, url, parentId)
    const id = result.lastInsertRowid

    if (id === 0n) {
      // better-sqlite3 returns bigint for lastInsertRowid
      const existingStmt = currentDB.prepare(
        'SELECT id, title, url, parent_id as parentId FROM subforums WHERE url = ?'
      )
      const existingSubforum = existingStmt.get(url) as Subforum | undefined

      if (!existingSubforum) {
        throw new Error(
          `Failed to insert subforum and could not retrieve existing ID for URL: ${url}`
        )
      }
      return existingSubforum
    }
    return { id: Number(id), title, url, parentId }
  } catch (error) {
    logError(`${EMOJI_ERROR} Failed to process subforum:`, error as Error)
    throw error
  }
}

export function insertThread(
  subforumUrl: string,
  title: string,
  url: string,
  creator: string,
  createdAt: string
): void {
  const currentDB = getDatabase()
  try {
    const stmt = currentDB.prepare(
      'INSERT OR IGNORE INTO threads (subforum_url, title, url, creator, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    stmt.run(subforumUrl, title, url, creator, createdAt)
  } catch (error) {
    logError(`${EMOJI_ERROR} Failed to process thread:`, error as Error)
    throw error
  }
}

export function trackUser(username: string, postedAt: string): void {
  const currentDB = getDatabase()
  try {
    const stmt = currentDB.prepare(`
            INSERT INTO users (username, first_seen, post_count)
            VALUES (?, ?, 1)
            ON CONFLICT(username) DO UPDATE SET
            post_count = post_count + 1
        `)
    stmt.run(username, postedAt)
  } catch (error) {
    logError(`${EMOJI_ERROR} Failed to track user:`, error as Error)
    throw error
  }
}

export function insertPost(
  threadUrl: string,
  username: string,
  comment: string,
  postedAt: string,
  userUrl: string
): number {
  const currentDB = getDatabase()
  try {
    const stmt = currentDB.prepare(
      'INSERT OR IGNORE INTO posts (thread_url, username, comment, posted_at, user_url) VALUES (?, ?, ?, ?, ?)'
    )
    const result = stmt.run(threadUrl, username, comment, postedAt, userUrl)
    trackUser(username, postedAt)
    return Number(result.lastInsertRowid)
  } catch (error) {
    logError(`${EMOJI_ERROR} Failed to process post:`, error as Error)
    throw error
  }
}

export function insertFile(
  postId: number,
  filename: string,
  mimeType: string | null,
  fileData: ArrayBuffer
): File {
  const currentDB = getDatabase()
  try {
    const stmt = currentDB.prepare(
      'INSERT INTO files (post_id, filename, mime_type, file_data) VALUES (?, ?, ?, ?)'
    )
    const result = stmt.run(postId, filename, mimeType, Buffer.from(fileData))
    const id = result.lastInsertRowid
    return { id: Number(id), postId, filename, mimeType, fileData }
  } catch (error) {
    logError(`${EMOJI_ERROR} Failed to process file:`, error as Error)
    throw error
  }
}

// Scraping state management functions
export function loadScrapedUrls(): void {
  const currentDB = getDatabase()
  try {
    const results = currentDB.prepare('SELECT url FROM scraped_urls').all() as {
      url: string
    }[]
    scrapedUrls.clear() // Clear existing set first
    results.forEach((row) => scrapedUrls.add(row.url))
    logInfo(`${EMOJI_INFO} Loaded ${scrapedUrls.size} previously scraped URLs`)
  } catch (error) {
    logError(`${EMOJI_ERROR} Failed to load scraped URLs:`, error as Error)
  }
}

export function loadDownloadedFiles(): void {
  const currentDB = getDatabase()
  try {
    const results = currentDB
      .prepare('SELECT url FROM downloaded_files')
      .all() as { url: string }[]
    downloadedFiles.clear() // Clear existing set first
    results.forEach((row) => downloadedFiles.add(row.url))
    logInfo(
      `${EMOJI_INFO} Loaded ${downloadedFiles.size} previously downloaded files`
    )
  } catch (error) {
    logError(`${EMOJI_ERROR} Failed to load downloaded files:`, error as Error)
  }
}

export function isUrlScraped(url: string): boolean {
  // First check memory cache for performance
  if (scrapedUrls.has(url)) {
    return true
  }

  // Then check database
  const currentDB = getDatabase()
  try {
    const stmt = currentDB.prepare('SELECT url FROM scraped_urls WHERE url = ?')
    const result = stmt.get(url) as { url: string } | undefined

    // If found in database but not in memory, add to memory cache
    if (result) {
      scrapedUrls.add(url)
      return true
    }

    return false
  } catch (error) {
    logError(
      `${EMOJI_ERROR} Failed to check if URL is scraped:`,
      error as Error
    )
    return false
  }
}

export function markUrlScraped(url: string): void {
  // Add to memory cache first
  scrapedUrls.add(url)

  // Then save to database
  const currentDB = getDatabase()
  try {
    const stmt = currentDB.prepare(
      'INSERT OR IGNORE INTO scraped_urls (url, scraped_at) VALUES (?, ?)'
    )
    stmt.run(url, new Date().toISOString())
  } catch (error) {
    logError(`${EMOJI_ERROR} Failed to mark URL as scraped:`, error as Error)
  }
}

export function isFileDownloaded(fileUrl: string): boolean {
  // First check memory cache for performance
  if (downloadedFiles.has(fileUrl)) {
    return true
  }

  // Then check database
  const currentDB = getDatabase()
  try {
    const stmt = currentDB.prepare(
      'SELECT url FROM downloaded_files WHERE url = ?'
    )
    const result = stmt.get(fileUrl) as { url: string } | undefined

    // If found in database but not in memory, add to memory cache
    if (result) {
      downloadedFiles.add(fileUrl)
      return true
    }

    return false
  } catch (error) {
    logError(
      `${EMOJI_ERROR} Failed to check if file is downloaded:`,
      error as Error
    )
    return false
  }
}

export function markFileDownloaded(fileUrl: string, postId: number): void {
  // Add to memory cache first
  downloadedFiles.add(fileUrl)

  // Then save to database
  const currentDB = getDatabase()
  try {
    const stmt = currentDB.prepare(
      'INSERT OR IGNORE INTO downloaded_files (url, post_id, downloaded_at) VALUES (?, ?, ?)'
    )
    stmt.run(fileUrl, postId, new Date().toISOString())
  } catch (error) {
    logError(
      `${EMOJI_ERROR} Failed to mark file as downloaded:`,
      error as Error
    )
  }
}

export function saveScrapingState(
  lastSubforumUrl: string | null,
  lastThreadUrl: string | null,
  completed: boolean = false
): void {
  const currentDB = getDatabase()
  try {
    const stmt = currentDB.prepare(`
            UPDATE scraping_state
            SET last_subforum_url = ?,
                last_thread_url = ?,
                last_updated = datetime('now'),
                completed = ?
            WHERE id = 1
        `)
    stmt.run(lastSubforumUrl, lastThreadUrl, completed ? 1 : 0)
    logInfo(
      `${EMOJI_INFO} Scraping state saved: ${
        lastSubforumUrl || 'NONE'
      } - ${lastThreadUrl || 'NONE'} - Completed: ${completed}`
    )
  } catch (error) {
    logError(`${EMOJI_ERROR} Failed to save scraping state:`, error as Error)
  }
}

export function getScrapingState(): ScrapingState {
  const currentDB = getDatabase()
  try {
    const stmt = currentDB.prepare(`
            SELECT
                last_subforum_url as lastScrapedSubforum,
                last_thread_url as lastScrapedThread,
                last_updated as lastUpdated,
                completed
            FROM scraping_state
            WHERE id = 1
        `)
    const result = stmt.get() as ScrapingState | undefined

    if (!result) {
      // Return default state if no record found
      logInfo(`${EMOJI_INFO} No scraping state found, using default state`)
      return {
        lastScrapedSubforum: null,
        lastScrapedThread: null,
        lastUpdated: new Date().toISOString(),
        completed: false,
      }
    }

    // Convert completed from number to boolean (SQLite stores booleans as 0/1)
    return {
      ...result,
      completed: !!result.completed,
    }
  } catch (error) {
    logError(`${EMOJI_ERROR} Failed to get scraping state:`, error as Error)
    // Return default state on error
    return {
      lastScrapedSubforum: null,
      lastScrapedThread: null,
      lastUpdated: new Date().toISOString(),
      completed: false,
    }
  }
}

export function resetScrapingState(): void {
  const currentDB = getDatabase()
  try {
    const stmt = currentDB.prepare(`
            UPDATE scraping_state
            SET last_subforum_url = NULL,
                last_thread_url = NULL,
                last_updated = datetime('now'),
                completed = 0
            WHERE id = 1
        `)
    stmt.run()
    logInfo(`${EMOJI_SUCCESS} Scraping state reset`)
  } catch (error) {
    logError(`${EMOJI_ERROR} Failed to reset scraping state:`, error as Error)
  }
}

export function getUrlsToScrape(urlList: string[]): string[] {
  const currentDB = getDatabase()
  const transaction = currentDB.transaction((urls: string[]) => {
    try {
      // Create a temporary table with the URLs to check
      currentDB.exec(`
              CREATE TEMPORARY TABLE IF NOT EXISTS urls_to_check (
                  url TEXT PRIMARY KEY
              )
          `)

      // Clear any existing data
      currentDB.exec(`DELETE FROM urls_to_check`)

      // Insert the URLs to check
      const insertStmt = currentDB.prepare(
        `INSERT OR IGNORE INTO urls_to_check (url) VALUES (?)`
      )
      urls.forEach((url) => {
        insertStmt.run(url)
      })

      // Get URLs that aren't in the scraped_urls table
      const results = currentDB
        .prepare(
          `
              SELECT utc.url
              FROM urls_to_check utc
              LEFT JOIN scraped_urls su ON utc.url = su.url
              WHERE su.url IS NULL
          `
        )
        .all() as { url: string }[]

      return results.map((row) => row.url)
    } finally {
      // Clean up temporary table
      try {
        currentDB.exec(`DROP TABLE IF EXISTS urls_to_check`)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  })
  return transaction(urlList)
}

export const getScrapedUrlsSet = (): Set<string> => scrapedUrls
export const getDownloadedFilesSet = (): Set<string> => downloadedFiles

if (require.main === module) {
  initialiseDatabase()
    .then(() => {
      console.log('Database reset script completed successfully.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Database reset script failed:', error)
      process.exit(1)
    })
}
