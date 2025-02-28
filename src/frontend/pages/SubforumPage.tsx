import type { Subforum } from '../../types/types'
import ThreadList from '../components/ThreadList'
import SubforumList from '../components/SubforumList'
import * as db from '../../database/index'

interface SubforumPageProps {
  subforum: Subforum
}

export default async function SubforumPage({ subforum }: SubforumPageProps) {
  const threads = await db.getThreadsBySubforum(subforum.url)
  const threadCount = await db.getThreadsCountBySubforum(subforum.url)
  const postCount = await db.getPostsCountBySubforum(subforum.url)
  const userCount = await db.getUsersCountBySubforum(subforum.url)
  const childSubforums = await db.getSubforums(subforum.id)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subforum.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 font-sans">
    <div class="container mx-auto p-4">
        <h1 class="text-2xl font-bold mb-4">${subforum.title}</h1>
        <p class="mb-4">Threads: ${threadCount}, Posts: ${postCount}, Users: ${userCount}</p>
        ${SubforumList({ subforums: childSubforums })}
        ${ThreadList({ threads, subforumUrl: subforum.url })}
    </div>
</body>
</html>
    `
}
