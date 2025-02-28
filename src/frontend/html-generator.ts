import type { Subforum, Thread } from '../types/types'
import * as db from '../database/index'
import * as fs from 'fs/promises'
import path from 'path'
import SubforumPage from './pages/SubforumPage'
import ThreadPage from './pages/ThreadPage'

const TIMEOUT_MS = 30000
const MAX_RETRIES = 3

// Helper functions
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        controller.signal.addEventListener('abort', () =>
          reject(new Error('Operation timed out'))
        )
      }),
    ])
  } finally {
    clearTimeout(timeoutId)
  }
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(operation(), TIMEOUT_MS)
    } catch (error) {
      lastError = error as Error
      console.error(
        `Attempt ${attempt}/${maxRetries} failed:`,
        lastError.message
      )
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

// Create specific helper functions for subforum and thread pages to avoid type issues
async function generateSubforumPage(
  subforum: Subforum,
  outputPath: string
): Promise<boolean> {
  try {
    const content = await retryOperation(() => SubforumPage({ subforum }))
    await fs.writeFile(outputPath, content)
    console.log(`Generated page for subforum: ${subforum.title}`)
    return true
  } catch (error) {
    console.error(`Failed to generate page for subforum:`, subforum, error)
    await fs.appendFile(
      'failed_pages.log',
      `${new Date().toISOString()}\t${outputPath}\tSubforum:${subforum.title}\n`
    )
    return false
  }
}

async function generateThreadPage(
  subforum: Subforum,
  thread: Thread,
  outputPath: string
): Promise<boolean> {
  try {
    const content = await retryOperation(() => ThreadPage({ subforum, thread }))
    await fs.writeFile(outputPath, content)
    console.log(`Generated page for thread: ${thread.title}`)
    return true
  } catch (error) {
    console.error(`Failed to generate page for thread:`, thread, error)
    await fs.appendFile(
      'failed_pages.log',
      `${new Date().toISOString()}\t${outputPath}\tThread:${thread.title}\n`
    )
    return false
  }
}

// Main HTML generation function
async function generateHTML(): Promise<void> {
  await db.getDatabase()
  const distDir = path.join(process.cwd(), 'dist')
  await fs.mkdir(distDir, { recursive: true })

  const subforums = await db.getSubforums()
  for (const subforum of subforums) {
    const subforumDir = path.join(
      distDir,
      subforum.url.replace(/[^a-zA-Z0-9]/g, '_')
    )
    await fs.mkdir(subforumDir, { recursive: true })

    // Generate subforum page
    await generateSubforumPage(
      subforum,
      path.join(distDir, `${subforum.url.replace(/[^a-zA-Z0-9]/g, '_')}.html`)
    )

    const [childSubforums, threads] = await Promise.all([
      db.getSubforums(subforum.id),
      db.getThreadsBySubforum(subforum.url),
    ])

    // Process child subforums
    for (const childSubforum of childSubforums) {
      await generateSubforumPage(
        childSubforum,
        path.join(
          distDir,
          `${childSubforum.url.replace(/[^a-zA-Z0-9]/g, '_')}.html`
        )
      )

      const childThreads = await db.getThreadsBySubforum(childSubforum.url)

      // Generate thread pages for child subforums
      await Promise.all(
        childThreads.map((thread) =>
          generateThreadPage(
            childSubforum,
            thread,
            path.join(
              subforumDir,
              `${thread.url.replace(/[^a-zA-Z0-9]/g, '_')}.html`
            )
          )
        )
      )
    }

    // Generate thread pages for main subforum
    await Promise.all(
      threads.map((thread) =>
        generateThreadPage(
          subforum,
          thread,
          path.join(
            subforumDir,
            `${thread.url.replace(/[^a-zA-Z0-9]/g, '_')}.html`
          )
        )
      )
    )
  }
  console.log('HTML generation completed.')
}

export default generateHTML
