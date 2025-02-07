import type { Post, File } from '../../types/types';
import * as db from '../../database/index';

interface PostListProps {
  posts: Post[];
}

export default async function PostList({ posts }: PostListProps) {
    let content = `<div class="divide-y divide-gray-200">`;

    for (const post of posts) {
        const files: File[] = await db.getFilesByPostId(post.id);
        content += `
      <div class="py-4">
        <p class="font-semibold">${post.username} <span class="text-sm text-gray-500">${post.postedAt}</span></p>
        <p class="mb-2">${post.comment}</p>
        ${files.length > 0 ? `
          <div class="mt-2">
            ${files.map(file => `<a href="${file.filename}" class="text-blue-600 hover:underline" download>${file.filename}</a>`).join(' ')}
          </div>
        ` : ''}
      </div>
    `;
    }

    content += `</div>`;
    return content;
}
