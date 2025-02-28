import type { Subforum } from '../../types/types'

interface SubforumListProps {
  subforums: Subforum[]
}

export default function SubforumList({ subforums }: SubforumListProps) {
  if (subforums.length === 0) return ''

  return `
        <div class="mb-8">
          <h2 class="text-xl font-semibold mb-2">Subforums</h2>
          <ul class="list-disc pl-5">
            ${subforums
              .map(
                (child) => `
              <li><a href="${child.url.replace(/[^a-zA-Z0-9]/g, '_')}.html" class="text-blue-600 hover:underline">${child.title}</a></li>
            `
              )
              .join('')}
          </ul>
        </div>
      `
}
