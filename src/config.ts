import 'dotenv/config'
import { dirname } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { type Config } from './types/types'

function getEnvVar(
  key: keyof Config,
  defaultValue: Config[keyof Config] | null = null
): Config[keyof Config] | null {
  const value = process.env[key]

  if (value === undefined) {
    if (defaultValue === null) {
      return null
    }
    return defaultValue
  }

  switch (typeof defaultValue) {
    case 'string':
      return value
    case 'number': {
      const num = parseInt(value, 10)
      if (isNaN(num)) {
        console.error(`❌ ${key} must be a valid number.`)
        process.exit(1)
      }
      return num
    }
    case 'boolean':
      if (value.toLowerCase() === 'true') {
        return true
      } else if (value.toLowerCase() === 'false') {
        return false
      }
      console.error(`❌ ${key} must be a boolean value (true or false).`)
      process.exit(1)
      break
    default:
      return value
  }
}

const DATABASE_PATH = String(getEnvVar('DATABASE_PATH', 'data/forum_data.db'))
const dbDir = dirname(DATABASE_PATH)
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
}

export const config: Config = {
  FORUM_URL: String(getEnvVar('FORUM_URL', '')),
  FORUM_URL_START_AT: String(
    getEnvVar('FORUM_URL_START_AT', getEnvVar('FORUM_URL', ''))
  ),
  DATABASE_PATH,
  USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  HEADERS: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  },
  DELAY_BETWEEN_REQUESTS: Number(getEnvVar('DELAY_BETWEEN_REQUESTS', 500)),
  MAX_RETRIES: Number(getEnvVar('MAX_RETRIES', 3)),
  RETRY_DELAY: Number(getEnvVar('RETRY_DELAY', 5000)),
  SUBFORUM_DELAY: Number(getEnvVar('SUBFORUM_DELAY', 10000)),
  DOWNLOAD_FILES: Boolean(getEnvVar('DOWNLOAD_FILES', false)),
  TEST_MODE: Boolean(getEnvVar('TEST_MODE', false)),
  MAX_SUBFORUMS: getEnvVar('MAX_SUBFORUMS', null) as number | null,
  MAX_THREADS_PER_SUBFORUM: getEnvVar('MAX_THREADS_PER_SUBFORUM', null) as
    | number
    | null,
  MAX_POSTS_PER_THREAD: getEnvVar('MAX_POSTS_PER_THREAD', null) as
    | number
    | null,
  MAX_PAGES_PER_SUBFORUM: getEnvVar('MAX_PAGES_PER_SUBFORUM', null) as
    | number
    | null,
  MAX_PAGES_PER_THREAD: getEnvVar('MAX_PAGES_PER_THREAD', null) as
    | number
    | null,
  CSS_SELECTOR_SUBFORUM: String(
    getEnvVar(
      'CSS_SELECTOR_SUBFORUM',
      'ol#forums > li.forumbit_nopost > ol.childforum > li.forumbit_post h2.forumtitle > a'
    )
  ),
  CSS_SELECTOR_THREAD: String(
    getEnvVar('CSS_SELECTOR_THREAD', '#threads > li.threadbit')
  ),
  CSS_SELECTOR_THREAD_TITLE: String(
    getEnvVar('CSS_SELECTOR_THREAD_TITLE', 'h3.threadtitle a.title')
  ),
  CSS_SELECTOR_THREAD_AUTHOR_DATE: String(
    getEnvVar(
      'CSS_SELECTOR_THREAD_AUTHOR_DATE',
      '.threadmeta .author span.label'
    )
  ),
  CSS_SELECTOR_STATS_THREADS: String(
    getEnvVar('CSS_SELECTOR_STATS_THREADS', 'dt:contains("Threads") + dd')
  ),
  CSS_SELECTOR_STATS_POSTS: String(
    getEnvVar('CSS_SELECTOR_STATS_POSTS', 'dt:contains("Posts") + dd')
  ),
  CSS_SELECTOR_STATS_MEMBERS: String(
    getEnvVar('CSS_SELECTOR_STATS_MEMBERS', 'dt:contains("Members") + dd')
  ),
  CSS_SELECTOR_PAGINATION: String(
    getEnvVar('CSS_SELECTOR_PAGINATION', 'a[rel="next"]')
  ),
  CSS_SELECTOR_PAGINATION_LAST: String(
    getEnvVar(
      'CSS_SELECTOR_PAGINATION_LAST',
      'div[id*="-pagenav-"] .pagination a'
    )
  ),
  CSS_SELECTOR_POST: String(getEnvVar('CSS_SELECTOR_POST', 'li.postcontainer')),
  CSS_SELECTOR_POST_AUTHOR: String(
    getEnvVar('CSS_SELECTOR_POST_AUTHOR', '.username strong')
  ),
  CSS_SELECTOR_POST_AUTHOR_LINK: String(
    getEnvVar('CSS_SELECTOR_POST_AUTHOR_LINK', 'a.username')
  ),
  CSS_SELECTOR_POST_CONTENT: String(
    getEnvVar(
      'CSS_SELECTOR_POST_CONTENT',
      'div[id^="post_message_"] blockquote.postcontent'
    )
  ),
  CSS_SELECTOR_POST_TIMESTAMP: String(
    getEnvVar(
      'CSS_SELECTOR_POST_TIMESTAMP',
      'div.posthead span.postdate span.date'
    )
  ),
  CSS_SELECTOR_POST_IMAGE: String(
    getEnvVar('CSS_SELECTOR_POST_IMAGE', '.js-post__content-text img[src]')
  ),
  CSS_SELECTOR_POST_ID_ATTRIBUTE: String(
    getEnvVar('CSS_SELECTOR_POST_ID_ATTRIBUTE', 'data-node-id')
  ),
  CSS_SELECTOR_POST_ID_REGEX: String(
    getEnvVar('CSS_SELECTOR_POST_ID_REGEX', '(\\d+)')
  ),
  USE_FLARESOLVERR: getEnvVar('USE_FLARESOLVERR', null) as string | null,
}
