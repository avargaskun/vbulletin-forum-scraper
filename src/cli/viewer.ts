import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
    setupDatabase,
    getSubforums,
    getThreadsBySubforum,
    getPostsByThread,
    closeDatabase
} from '../database';
import { EMOJI_SUCCESS, EMOJI_INFO, EMOJI_ERROR, EMOJI_WARN } from '../types/types';
import { execSync } from 'node:child_process';

const ITEMS_PER_PAGE = 10;

function clearConsole(): void {
    console.clear();
    process.stdout.write('\x1Bc');
}

async function showMenu(prompt: string, options: string[]): Promise<number> {
    console.log(`\n${prompt}`);
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

function showStats(subforums: number, threads: number, posts: number): void {
    console.log('\n=== Forum Statistics ===');
    console.log(`${EMOJI_INFO} Total Subforums: ${subforums}`);
    console.log(`${EMOJI_INFO} Total Threads: ${threads}`);
    console.log(`${EMOJI_INFO} Total Posts: ${posts}`);
    console.log('=====================\n');
}

async function browseSubforums(page: number = 1): Promise<void> {
    clearConsole();
    console.log(`${EMOJI_INFO} Browsing Subforums:\n`);

    const subforums = getSubforums();
    if (subforums.length === 0) {
        console.log(`${EMOJI_WARN} No subforums found.`);
        return;
    }

    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const pageSubforums = subforums.slice(startIdx, endIdx);

    const options = pageSubforums.map((subforum) => subforum.title);

    if (page > 1) options.push('Previous Page');
    if (endIdx < subforums.length) options.push('Next Page');
    options.push('Exit');

    showStats(subforums.length, 0, 0);

    const choice = await showMenu('Select a subforum:', options);
    if (choice === -1 || choice === options.length) {
        return;
    }

    if (options[choice - 1] === 'Previous Page') {
        await browseSubforums(page - 1);
    } else if (options[choice - 1] === 'Next Page') {
        await browseSubforums(page + 1);
    } else {
        const selectedSubforum = pageSubforums[choice - 1];
        await browseThreads(selectedSubforum.url);
    }
}

async function browseThreads(subforumUrl: string, page: number = 1): Promise<void> {
    clearConsole();
    console.log(`${EMOJI_INFO} Browsing Threads:\n`);

    const threads = getThreadsBySubforum(subforumUrl);
    if (threads.length === 0) {
        console.log(`${EMOJI_WARN} No threads found in this subforum.`);
        return;
    }

    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const pageThreads = threads.slice(startIdx, endIdx);

    pageThreads.forEach((thread) => {
        console.log(`${EMOJI_SUCCESS} ${thread.title}`);
        console.log(`   Created by: ${thread.creator}`);
        console.log(`   Posted on: ${formatDate(thread.created_at)}`);
        console.log('   ' + '-'.repeat(50));
    });

    const options = pageThreads.map((thread) => thread.title);

    if (page > 1) options.push('Previous Page');
    if (endIdx < threads.length) options.push('Next Page');
    options.push('Back');

    console.log(`\nShowing threads ${startIdx + 1}-${Math.min(endIdx, threads.length)} of ${threads.length}`);

    const choice = await showMenu('Select a thread:', options);
    if (choice === -1 || choice === options.length) {
        return;
    }

    if (options[choice - 1] === 'Previous Page') {
        await browseThreads(subforumUrl, page - 1);
    } else if (options[choice - 1] === 'Next Page') {
        await browseThreads(subforumUrl, page + 1);
    } else {
        const selectedThread = pageThreads[choice - 1];
        await viewThread(selectedThread.url);
    }
}

async function viewThread(threadUrl: string, page: number = 1): Promise<void> {
    clearConsole();
    console.log(`${EMOJI_INFO} Viewing Thread:\n`);

    const posts = getPostsByThread(threadUrl);
    if (posts.length === 0) {
        console.log(`${EMOJI_WARN} No posts found.`);
    } else {
        const startIdx = (page - 1) * ITEMS_PER_PAGE;
        const endIdx = startIdx + ITEMS_PER_PAGE;
        const pagePosts = posts.slice(startIdx, endIdx);

        pagePosts.forEach((post) => {
            console.log(`\n🗨️  ${post.username} (${formatDate(post.posted_at)}):`);
            console.log(post.comment);
            console.log('-'.repeat(50));
        });

        if (posts.length > ITEMS_PER_PAGE) {
            console.log(`\nShowing posts ${startIdx + 1}-${Math.min(endIdx, posts.length)} of ${posts.length}`);

            if (page > 1) console.log('(P) Previous Page');
            if (endIdx < posts.length) console.log('(N) Next Page');
        }
    }

    const rl = readline.createInterface({ input, output });
    try {
        const answer = await rl.question(`\n${EMOJI_SUCCESS} Press Enter to return, P for previous page, N for next page: `);
        if (answer.toLowerCase() === 'p' && page > 1) {
            await viewThread(threadUrl, page - 1);
        } else if (answer.toLowerCase() === 'n' && (page * ITEMS_PER_PAGE) < posts.length) {
            await viewThread(threadUrl, page + 1);
        }
    } finally {
        rl.close();
    }
}

async function main(): Promise<void> {
    setupDatabase();
    try {
        while (true) {
            const choice = await showMenu('Main Menu:', ['Browse Subforums', 'Exit']);
            if (choice === 1) {
                await browseSubforums();
            } else {
                console.log(`${EMOJI_SUCCESS} Exiting...`);
                break;
            }
        }
    } catch (error) {
        console.error(`${EMOJI_ERROR} Error:`, error);
    } finally {
        closeDatabase();
    }
}

main().catch((error) => console.error(`${EMOJI_ERROR} Unexpected error:`, error));
