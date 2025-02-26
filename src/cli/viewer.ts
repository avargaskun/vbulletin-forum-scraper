import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
    setupDatabase,
    getSubforums,
    getThreadsBySubforum,
    getPostsByThread,
    closeDatabase,
    getThreadsCountBySubforum,
    getPostsCountBySubforum,
    getUsersCountBySubforum,
    getUsersCountByThread,
    getFilesByPostId
} from '../database';
import { EMOJI_SUCCESS, EMOJI_INFO, EMOJI_ERROR, EMOJI_WARN, type Subforum, type Thread, type Post, type File } from '../types/types';
import { Jimp } from 'jimp';
import { intToRGBA } from '@jimp/utils';
import boxen from 'boxen';

const ITEMS_PER_PAGE = 10;

// Helper Functions
function clearConsole(): void {
    console.clear();
    process.stdout.write('\x1Bc');
}

function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
}

async function showMenu(prompt: string, options: string[]): Promise<number> {
    console.log(boxen(prompt, {padding: 1, margin: 1, borderStyle: 'double'}));
    options.forEach((option, index) => {
        console.log(`${index + 1}. ${option}`);
    });

    const rl = readline.createInterface({ input, output });
    try {
        while (true) {
            const answer = await rl.question('Enter your choice (or q to go back): ');
            if (answer.toLowerCase() === 'q') return -1;

            const choice = parseInt(answer);
            if (!isNaN(choice) && choice >= 1 && choice <= options.length) {
                return choice;
            } else {
                console.log(`${EMOJI_WARN} Invalid choice. Please try again.`);
            }
        }
    } finally {
        rl.close();
    }
}

async function imageToAscii(imageBuffer: ArrayBuffer, width: number = 80): Promise<string> {
    try {
        if (!(imageBuffer instanceof ArrayBuffer)) {
            throw new Error("imageBuffer must be an ArrayBuffer");
        }
        const image = await Jimp.read(Buffer.from(imageBuffer));

        // Calculate the new height to maintain aspect ratio
        const originalWidth = image.bitmap.width;
        const originalHeight = image.bitmap.height;
        const aspectRatio = originalHeight / originalWidth;
        const newHeight = Math.round(width * aspectRatio);

        // Resize the image to the new dimensions
        image.resize({w: width, h: newHeight});
        image.greyscale();

        const height = image.bitmap.height;
        let asciiArt = '';

        // Character set from dark to light
        const chars = "@%#*+=-:. ";

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixelColor = image.getPixelColor(x, y);
                const { r, g, b } = intToRGBA(pixelColor);
                const intensity = (r + g + b) / (3 * 255); // Average intensity

                const charIndex = Math.floor(intensity * (chars.length - 1)); // Ensure index is within bounds
                asciiArt += chars[charIndex];
            }
            asciiArt += '\n';
        }

        return asciiArt;

    } catch (error) {
        console.error(`Error converting image to ASCII:`, error);
        return 'Error converting image';
    }
}

// Main browsing functions
async function viewThread(threadUrl: string, page: number = 1, subforumUrl: string | null = null): Promise<void> {
    clearConsole();
    console.log(boxen(`${EMOJI_INFO} Viewing Thread:`, {padding: 1, margin: 1, borderStyle: 'double'}));

    const posts: Post[] = await getPostsByThread(threadUrl);
    if (posts.length === 0) {
        console.log(`${EMOJI_WARN} No posts found.`);
    } else {
        const startIdx = (page - 1) * ITEMS_PER_PAGE;
        const endIdx = startIdx + ITEMS_PER_PAGE;
        const pagePosts: Post[] = posts.slice(startIdx, endIdx);

        const userCount = await getUsersCountByThread(threadUrl);
        const lastPost = posts.length > 0 ? formatDate(posts[posts.length - 1].postedAt) : 'N/A';

        console.log(`${EMOJI_INFO} Thread Stats: 👤 ${userCount}, 👀 Last Post: ${lastPost}\n`);

        for (const post of pagePosts) {
            console.log(`\n🗨️  ${post.username} (${formatDate(post.postedAt)}):`);
            console.log(post.comment);

            const files: File[] = await getFilesByPostId(post.id);
            for (const file of files) {
                if (file.mimeType?.startsWith('image')) {
                    const ascii = await imageToAscii(file.fileData);
                    console.log(ascii);
                } else {
                    console.log(`  📎 Attached file: ${file.filename} (${file.mimeType || 'Unknown type'})`);
                }
            }

            console.log('-'.repeat(50));
        }

        if (posts.length > ITEMS_PER_PAGE) {
            console.log(`\nShowing posts ${startIdx + 1}-${Math.min(endIdx, posts.length)} of ${posts.length}`);

            if (page > 1) console.log('(P) Previous Page');
            if (endIdx < posts.length) console.log('(N) Next Page');
        }
    }

    const rl = readline.createInterface({ input, output });
    try {
        let prompt = `\n${EMOJI_SUCCESS} Press Enter to return to thread list, P for previous page, N for next page`;
        if (subforumUrl) {
            prompt += ", B to go back to subforum";
        }
        const answer = await rl.question(`${prompt}: `);

        if (answer.toLowerCase() === 'p' && page > 1) {
            await viewThread(threadUrl, page - 1, subforumUrl);
        } else if (answer.toLowerCase() === 'n' && (page * ITEMS_PER_PAGE) < posts.length) {
            await viewThread(threadUrl, page + 1, subforumUrl);
        } else if (answer.toLowerCase() === 'b' && subforumUrl) {
            await browseThreads(subforumUrl);
        } else {
            const threads = await getThreadsBySubforum(subforumUrl ? subforumUrl : '');
            if (threads) {
                const selectedThread = threads.find(thread => thread.url === threadUrl);
                if (selectedThread) {
                    await browseThreads(selectedThread.subforumUrl);
                }
            }
        }
    } finally {
        rl.close();
    }
}

async function browseThreads(subforumUrl: string, page: number = 1): Promise<void> {
    clearConsole();
    console.log(boxen(`${EMOJI_INFO} Browsing Threads:`, {padding: 1, margin: 1, borderStyle: 'double'}));

    const threads: Thread[] = await getThreadsBySubforum(subforumUrl);
    if (threads.length === 0) {
        console.log(`${EMOJI_WARN} No threads found in this subforum.`);
        const rl = readline.createInterface({ input, output });
        try {
            await rl.question(`${EMOJI_INFO} Press Enter to go back...`);
        } finally {
            rl.close();
        }
        return;
    }

    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const pageThreads: Thread[] = threads.slice(startIdx, endIdx);

    const [postCount, userCount] = await Promise.all([
        getPostsCountBySubforum(subforumUrl),
        getUsersCountBySubforum(subforumUrl)
    ]);

    console.log(`${EMOJI_INFO} Subforum Stats: 💬 ${postCount}, 👤 ${userCount}\n`);

    const options = [];
    for (const [index, thread] of pageThreads.entries()) {
        const posts = await getPostsByThread(thread.url);
        const postCount = posts.length;
        options.push(`${startIdx + index + 1}. ${thread.title} - ${thread.creator} (💬 ${postCount}) [${formatDate(thread.createdAt)}]`);
    }

    if (page > 1) options.push('Previous Page');
    if (endIdx < threads.length) options.push('Next Page');
    options.push('Back');

    console.log(`\nShowing threads ${startIdx + 1}-${Math.min(endIdx, threads.length)} of ${threads.length}`);

    const choice = await showMenu('Select a thread:', options);
    if (choice === -1 || options[options.length -1] === 'Back') {
        return;
    }

    if (options[choice - 1] === 'Previous Page') {
        await browseThreads(subforumUrl, page - 1);
    } else if (options[choice - 1] === 'Next Page') {
        await browseThreads(subforumUrl, page + 1);
    } else {
        let selectedIndex = choice - 1;
        const selectedThread = pageThreads[selectedIndex];
        await viewThread(selectedThread.url, 1, subforumUrl);
    }
}

async function browseSubforums(parentId: number | null = null, page: number = 1): Promise<void> {
    clearConsole();
    console.log(boxen(`${EMOJI_INFO} Browsing Subforums:`, {padding: 1, margin: 1, borderStyle: 'double'}));

    const subforums: Subforum[] = await getSubforums(parentId);
    if (subforums.length === 0) {
        console.log(`${EMOJI_WARN} No subforums found.`);
        const rl = readline.createInterface({ input, output });
        try {
            await rl.question(`${EMOJI_INFO} Press Enter to exit...`);
        } finally {
            rl.close();
        }
        return;
    }

    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const pageSubforums: Subforum[] = subforums.slice(startIdx, endIdx);

    for (const [index, subforum] of pageSubforums.entries()) {
        const threadCount = parentId === null ? await getThreadsCountBySubforum(subforum.url) : 0;
        const childSubforums = await getSubforums(subforum.id);
        const childCount = childSubforums.length;

        let diagnosticString = `${startIdx + index + 1}. ${subforum.title} `;
        if (parentId === null) {
             diagnosticString += `(🧵 ${threadCount})`;
        }
        if (childCount > 0) {
            diagnosticString += ` (⭐ ${childCount})`;
        }
        console.log(diagnosticString);
    }

    const options = pageSubforums.map((subforum) => subforum.title);

    if (page > 1) options.push('Previous Page');
    if (endIdx < subforums.length) options.push('Next Page');
    options.push('Exit');

    const choice = await showMenu('Select a subforum:', options);
    if (choice === -1 || options[choice - 1] === 'Exit') {
        return;
    }

    if (options[choice - 1] === 'Previous Page') {
        await browseSubforums(parentId, page - 1);
    } else if (options[choice - 1] === 'Next Page') {
        await browseSubforums(parentId, page + 1);
    } else {
        const selectedSubforum = pageSubforums[choice - 1];
        const hasChildren = (await getSubforums(selectedSubforum.id)).length > 0;
        if (hasChildren) {
            await browseSubforums(selectedSubforum.id);
        } else {
            await browseThreads(selectedSubforum.url);
        }
    }
}

// Main entry point
async function main(): Promise<void> {
    await setupDatabase();
    try {
        await browseSubforums();
    } catch (error) {
        console.error(`${EMOJI_ERROR} Error:`, error);
    } finally {
        await closeDatabase();
    }
}

main().catch((error) => console.error(`${EMOJI_ERROR} Unexpected error:`, error));
