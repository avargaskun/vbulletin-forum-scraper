import type { Thread } from '../../types/types';

interface ThreadListProps {
  threads: Thread[];
  subforumUrl: string;
}

export default function ThreadList({ threads, subforumUrl }: ThreadListProps) {
  return `
        <h2 class="text-xl font-semibold mb-2">Threads</h2>
        <ul class="divide-y divide-gray-200">
            ${threads.map(thread => `
                <li class="py-2">
                    <a href="${subforumUrl.replace(/[^a-zA-Z0-9]/g, '_')}/${thread.url.replace(/[^a-zA-Z0-9]/g, '_')}.html" class="text-blue-600 hover:underline">${thread.title}</a>
                    <span class="text-gray-500 text-sm"> - Started by ${thread.creator} on ${thread.createdAt}</span>
                </li>
            `).join('')}
        </ul>
    `;
}
