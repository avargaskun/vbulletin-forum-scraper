import {
  setupDatabase,
  closeDatabase,
  getAllThreads,
  getThreadsWithRecentPosts,
  getPostsByThread,
} from '../database'
import { EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_INFO } from '../types/types'
import { logInfo, logError } from '../utils/logging'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { writeFileSync } from 'fs'

const OUTPUT_FILE = 'export.txt'

async function exportData(date?: string) {
  await setupDatabase()

  try {
    const threads = date
      ? await getThreadsWithRecentPosts(date)
      : await getAllThreads()

    if (threads.length === 0) {
      logInfo(`${EMOJI_INFO} No threads found to export.`)
      return
    }

    let output = ''

    for (const thread of threads) {
      output += `Thread: ${thread.title}\n`
      output += `Creator: ${thread.creator}\n`
      output += `Date: ${thread.createdAt}\n`
      output += `URL: ${thread.url}\n\n`

      const posts = await getPostsByThread(thread.url)
      for (const post of posts) {
        output += `  User: ${post.username}\n`
        output += `  Date: ${post.postedAt}\n`
        output += `  Comment: ${post.comment}\n`
        output += `  ----------------------------------------\n`
      }
      output += `\n============================================================\n\n`
    }

    writeFileSync(OUTPUT_FILE, output)

    logInfo(
      `${EMOJI_SUCCESS} Successfully exported ${threads.length} threads to ${OUTPUT_FILE}`
    )
  } catch (error) {
    logError(`${EMOJI_ERROR} Failed to export data:`, error as Error)
  } finally {
    await closeDatabase()
  }
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('date', {
      alias: 'd',
      type: 'string',
      description: 'Export posts newer than this date (YYYY-MM-DD)',
    })
    .help()
    .alias('help', 'h').argv

  const date = argv.date

  if (date) {
    logInfo(`${EMOJI_INFO} Exporting threads with posts newer than ${date}...`)
  } else {
    logInfo(`${EMOJI_INFO} Exporting all threads...`)
  }

  await exportData(date)
}

main()
