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

async function exportData(date?: string, format: string = 'json') {
  const outputFile = `export.${format}`
  await setupDatabase()

  try {
    const threads = date
      ? await getThreadsWithRecentPosts(date)
      : await getAllThreads()

    if (threads.length === 0) {
      logInfo(`${EMOJI_INFO} No threads found to export.`)
      return
    }

    if (format === 'json') {
      const data = []
      for (const thread of threads) {
        const posts = await getPostsByThread(thread.url)
        data.push({ ...thread, posts })
      }
      writeFileSync(outputFile, JSON.stringify(data, null, 2))
    } else {
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
      writeFileSync(outputFile, output)
    }

    logInfo(
      `${EMOJI_SUCCESS} Successfully exported ${threads.length} threads to ${outputFile}`
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
    .option('format', {
      alias: 'f',
      type: 'string',
      choices: ['text', 'json'],
      default: 'json',
      description: 'Output format',
    })
    .help()
    .alias('help', 'h').argv

  const date = argv.date
  const format = argv.format

  if (date) {
    logInfo(
      `${EMOJI_INFO} Exporting threads with posts newer than ${date} in ${format} format...`
    )
  } else {
    logInfo(`${EMOJI_INFO} Exporting all threads in ${format} format...`)
  }

  await exportData(date, format)
}

main()
