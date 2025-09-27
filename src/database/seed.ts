import {
  setupDatabase,
  closeDatabase,
  insertSubforum,
  insertThread,
  insertPost,
} from './index'
import { logInfo, logSuccess, logError } from '../utils/logging'

async function seedDatabase() {
  try {
    logInfo('Starting database seed process...')
    await setupDatabase()

    // Sample Data
    const subforums = [
      {
        id: 1,
        title: 'General Discussion',
        url: 'https://example.com/general',
        parentId: null,
      },
      {
        id: 2,
        title: 'Hardware',
        url: 'https://example.com/hardware',
        parentId: 1,
      },
    ]

    const threads = [
      {
        id: 1,
        subforumUrl: 'https://example.com/general',
        title: 'Welcome to the forums!',
        url: 'https://example.com/thread1',
        creator: 'Admin',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        subforumUrl: 'https://example.com/hardware',
        title: 'Post your PC specs',
        url: 'https://example.com/thread2',
        creator: 'User1',
        createdAt: new Date().toISOString(),
      },
    ]

    const posts = [
      {
        threadUrl: 'https://example.com/thread1',
        username: 'Admin',
        comment: 'This is the first post.',
        postedAt: new Date().toISOString(),
        userUrl: 'https://example.com/user/admin',
      },
      {
        threadUrl: 'https://example.com/thread2',
        username: 'User1',
        comment: 'Here are my specs: ...',
        postedAt: new Date().toISOString(),
        userUrl: 'https://example.com/user/user1',
      },
      {
        threadUrl: 'https://example.com/thread2',
        username: 'User2',
        comment: 'Nice setup!',
        postedAt: new Date().toISOString(),
        userUrl: 'https://example.com/user/user2',
      },
    ]

    // Insert Subforums
    for (const subforum of subforums) {
      await insertSubforum(subforum.title, subforum.url, subforum.parentId)
    }
    logInfo('Seeded subforums.')

    // Insert Threads
    for (const thread of threads) {
      insertThread(
        thread.subforumUrl,
        thread.title,
        thread.url,
        thread.creator,
        thread.createdAt
      )
    }
    logInfo('Seeded threads.')

    // Insert Posts
    for (const post of posts) {
      insertPost(
        post.threadUrl,
        post.username,
        post.comment,
        post.postedAt,
        post.userUrl
      )
    }
    logInfo('Seeded posts.')

    logSuccess('Database seeding completed successfully.')
  } catch (error) {
    logError('Error seeding database:', error as Error)
  } finally {
    closeDatabase()
  }
}

seedDatabase()
