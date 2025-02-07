import type { Subforum, Thread } from '../../types/types';
import PostList from '../components/PostList';
import * as db from '../../database/index';


interface ThreadPageProps {
  subforum: Subforum;
  thread: Thread;
}

export default async function ThreadPage({ subforum, thread }: ThreadPageProps) {
    const posts = await db.getPostsByThread(thread.url);
    const userCount = await db.getUsersCountByThread(thread.url);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${thread.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 font-sans">
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4"><a href="../${subforum.url.replace(/[^a-zA-Z0-9]/g, '_')}.html" class="text-blue-600 hover:underline">${subforum.title}</a> - ${thread.title}</h1>
     <p class="mb-4">Users: ${userCount}</p>
    ${await PostList({ posts })}
  </div>
</body>
</html>
  `;
}
