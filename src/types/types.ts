export const EMOJI_SUCCESS = '✅'
export const EMOJI_ERROR = '❌'
export const EMOJI_WARN = '⚠️'
export const EMOJI_INFO = 'ℹ️'

export interface Subforum {
  id: number
  title: string
  url: string
  parentId: number | null
}

export interface Thread {
  id: number
  subforumUrl: string
  title: string
  url: string
  creator: string
  createdAt: string
}

export interface Post {
  id: number
  threadUrl: string
  username: string
  comment: string
  postedAt: string
  userUrl: string
}

export interface File {
  id: number
  postId: number
  filename: string
  mimeType: string | null
  fileData: ArrayBuffer
}

export interface ForumStats {
  totalThreads: number
  totalPosts: number
  totalUsers: number
}

export interface ScrapingStats {
  subforums: number
  threads: number
  posts: number
  users: number
  pagesProcessed: number
  startTime: Date
  binariesDownloaded: number
  binariesFailed: number
  percentComplete?: {
    threads: number
    posts: number
    users: number
  }
  totals?: ForumStats
}

export interface FetchError extends Error {
  type: 'network' | 'http' | 'empty' | 'duplicate' | 'stuck'
  status?: number
}

export interface Config {
  FORUM_URL: string
  FORUM_URL_START_AT: string
  DATABASE_PATH: string
  USER_AGENT: string
  HEADERS: { 'User-Agent': string }
  DELAY_BETWEEN_REQUESTS: number
  MAX_RETRIES: number
  RETRY_DELAY: number
  SUBFORUM_DELAY: number
  DOWNLOAD_FILES: boolean
  TEST_MODE: boolean
  MAX_SUBFORUMS: number | null
  MAX_THREADS_PER_SUBFORUM: number | null
  MAX_POSTS_PER_THREAD: number | null
  MAX_PAGES_PER_SUBFORUM: number | null
  MAX_PAGES_PER_THREAD: number | null
  CSS_SELECTOR_SUBFORUM: string
  CSS_SELECTOR_THREAD: string
  CSS_SELECTOR_THREAD_TITLE: string
  CSS_SELECTOR_THREAD_AUTHOR_DATE: string
  CSS_SELECTOR_STATS_THREADS: string
  CSS_SELECTOR_STATS_POSTS: string
  CSS_SELECTOR_STATS_MEMBERS: string
  CSS_SELECTOR_PAGINATION: string
  CSS_SELECTOR_PAGINATION_LAST: string
  CSS_SELECTOR_POST: string
  CSS_SELECTOR_POST_AUTHOR: string
  CSS_SELECTOR_POST_AUTHOR_LINK: string
  CSS_SELECTOR_POST_CONTENT: string
  CSS_SELECTOR_POST_TIMESTAMP: string
  CSS_SELECTOR_POST_IMAGE: string
  CSS_SELECTOR_POST_ID_ATTRIBUTE: string
  CSS_SELECTOR_POST_ID_REGEX: string
  USE_FLARESOLVERR: string | null
}

export interface ScrapingState {
  lastScrapedSubforum: string | null
  lastScrapedThread: string | null
  lastUpdated: string
  completed: boolean
}

export type FetchOptions = { shouldMarkScraped?: boolean }
