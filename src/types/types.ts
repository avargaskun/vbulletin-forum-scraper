export const EMOJI_SUCCESS = '✅';
export const EMOJI_ERROR = '❌';
export const EMOJI_WARN = '⚠️';
export const EMOJI_INFO = 'ℹ️';

export interface Subforum {
    id: number;
    title: string;
    url: string;
}

export interface Thread {
    id: number;
    subforum_url: string;
    title: string;
    url: string;
    creator: string;
    created_at: string;
}

export interface Post {
    id: number;
    thread_url: string;
    username: string;
    comment: string;
    posted_at: string;
    user_url: string;
}

export interface File { // Renamed
    id: number;
    post_id: number;
    filename: string;
    mime_type: string | null;
    file_data: ArrayBuffer;
}
export interface ForumStats {
  totalThreads: number;
  totalPosts: number;
  totalUsers: number
}

export interface ScrapingStats {
    subforums: number;
    threads: number;
    posts: number;
    users: number;
    pagesProcessed: number;
    startTime: Date;
    percentComplete?: {
        threads: number;
        posts: number;
        users: number
    },
    totals?: ForumStats
}
export interface FetchError extends Error {
    type: 'network' | 'http' | 'empty';
    status?: number;
}

export interface Config {
    FORUM_URL: string;
    DATABASE_PATH: string;
    USER_AGENT: string;
    HEADERS: { 'User-Agent': string };
    DELAY_BETWEEN_REQUESTS: number;
    MAX_RETRIES: number;
    RETRY_DELAY: number;
    SUBFORUM_DELAY: number;
    DOWNLOAD_FILES: boolean;
}
