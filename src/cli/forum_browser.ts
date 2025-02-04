import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import * as dotenv from 'dotenv';
import { EMOJI_ERROR, EMOJI_INFO, EMOJI_SUCCESS } from "../types/types";
import { getSubforums, getThreadsBySubforum, getThreadComments, setupDatabase } from "../database/index";

dotenv.config();

function clearConsole(): void {
    console.clear();
    process.stdout.write('\x1Bc');
}

async function showMenu(prompt: string, options: string[]): Promise<number> {
    console.log('\n' + prompt);
    options.forEach((option, i) => console.log(`${i + 1}. ${option}`));

    const rl = readline.createInterface({ input, output });
    let choice: number | undefined;

    try {
        while (true) {
            let answer = await rl.question('Enter your choice: ');
            let parsedChoice = parseInt(answer);
            if (!isNaN(parsedChoice) && parsedChoice >= 1 && parsedChoice <= options.length) {
                choice = parsedChoice;
                break;
            } else {
                console.log(`${EMOJI_ERROR} Invalid choice. Please try again.`);
            }
        }
        return choice!;
    } finally {
        rl.close();
    }
}

async function browseSubforums(): Promise<void> {
    clearConsole();
    console.log(`${EMOJI_INFO} Browsing Subforums:\n`);

    const subforums = getSubforums();

    if (subforums.length === 0) {
        console.log('No subforums found.');
        return;
    }

    const options = subforums.map(sf => `${sf.title} (${sf.thread_count} threads)`);
    options.push('Back');

    const choice = await showMenu('Select a subforum:', options);
    if (choice === options.length) return;

    const selectedSubforum = subforums[choice - 1];
    await browseThreads(selectedSubforum.url);
}

async function browseThreads(subforumUrl: string): Promise<void> {
    clearConsole();
    console.log(`${EMOJI_INFO} Browsing Threads:\n`);

    const threads = getThreadsBySubforum(subforumUrl);

    if (threads.length === 0) {
        console.log('No threads found in this subforum.');
        await showMenu('Options:', ['Back to Subforums']);
        return browseSubforums();
    }

    const options = threads.map(t => `${t.title} (by ${t.creator})`);
    options.push('Back');

    const choice = await showMenu('Select a thread:', options);
    if (choice === options.length) return browseSubforums();

    const selectedThread = threads[choice - 1];
    await viewThread(selectedThread.url, subforumUrl);
}

async function viewThread(threadUrl: string, subforumUrl: string): Promise<void> {
    clearConsole();
    console.log(`${EMOJI_INFO} Viewing Thread:\n`);

    const comments = getThreadComments(threadUrl);
    if (comments.length === 0) {
        console.log(`${EMOJI_INFO} No Comments`);
    } else {
        comments.forEach(comment => console.log(`  ${comment.username}: ${comment.comment}\n`));
    }

    const rl = readline.createInterface({ input, output });
    try {
        await rl.question('Press Enter to go back to threads...');
        await browseThreads(subforumUrl);
    } finally {
        rl.close();
    }
}

async function main(): Promise<void> {
    setupDatabase();
    while (true) {
        clearConsole();
        const choice = await showMenu('Main Menu:', ['Browse Subforums', 'Exit']);
        if (choice === 1) await browseSubforums();
        else break;
    }
    console.log('Exiting...');
}

main().catch(err => console.error(`${EMOJI_ERROR} An error occurred:`, err));
