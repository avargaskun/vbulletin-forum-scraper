import type { Subforum, Thread } from '../types/types';
import * as db from '../database/index';
import * as fs from 'fs/promises';
import path from 'path';
import SubforumPage from './pages/SubforumPage';
import ThreadPage from './pages/ThreadPage';

const TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                controller.signal.addEventListener('abort', () =>
                    reject(new Error('Operation timed out'))
                );
            })
        ]);
    } finally {
        clearTimeout(timeoutId);
    }
}

async function retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = MAX_RETRIES
): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await withTimeout(operation(), TIMEOUT_MS);
        } catch (error) {
            lastError = error as Error;
            console.error(`Attempt ${attempt}/${maxRetries} failed:`, lastError.message);
            if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

async function generatePage(
    generator: (params: { subforum: Subforum; thread?: Thread }) => Promise<string>,
    params: { subforum: Subforum; thread?: Thread },
    outputPath: string
): Promise<boolean> {
    try {
        const content = await retryOperation(() => generator(params));
        await fs.writeFile(outputPath, content);
        return true;
    } catch (error) {
        console.error(`Failed to generate page for:`, params, error);
        await fs.appendFile('failed_pages.log',
            `${new Date().toISOString()}\t${outputPath}\t${JSON.stringify(params)}\n`);
        return false;
    }
}

async function generateHTML(): Promise<void> {
    await db.getDatabase();
    const distDir = path.join(process.cwd(), 'dist');
    await fs.mkdir(distDir, { recursive: true });

    const subforums = await db.getSubforums();
    for (const subforum of subforums) {
        const subforumDir = path.join(distDir, subforum.url.replace(/[^a-zA-Z0-9]/g, '_'));
        await fs.mkdir(subforumDir, { recursive: true });

        await generatePage(
            SubforumPage,
            { subforum },
            path.join(distDir, `${subforum.url.replace(/[^a-zA-Z0-9]/g, '_')}.html`)
        ).then(success => {
            if (success) console.log(`Generated page for subforum: ${subforum.title}`);
        });

        const [childSubforums, threads] = await Promise.all([
            db.getSubforums(subforum.id),
            db.getThreadsBySubforum(subforum.url)
        ]);

        await Promise.all([
            ...childSubforums.map(async childSubforum => {
                await generatePage(
                    SubforumPage,
                    { subforum: childSubforum },
                    path.join(distDir, `${childSubforum.url.replace(/[^a-zA-Z0-9]/g, '_')}.html`)
                ).then(success => {
                    if (success) console.log(`Generated page for subforum: ${childSubforum.title}`);
                });

                const childThreads = await db.getThreadsBySubforum(childSubforum.url);
                return Promise.all(childThreads.map(thread =>
                    generatePage(
                        ThreadPage,
                        { subforum: childSubforum, thread },
                        path.join(subforumDir, `${thread.url.replace(/[^a-zA-Z0-9]/g, '_')}.html`)
                    ).then(success => {
                        if (success) console.log(`Generated page for thread: ${thread.title}`);
                    })
                ));
            }),
            ...threads.map(thread =>
                generatePage(
                    ThreadPage,
                    { subforum, thread },
                    path.join(subforumDir, `${thread.url.replace(/[^a-zA-Z0-9]/g, '_')}.html`)
                ).then(success => {
                    if (success) console.log(`Generated page for thread: ${thread.title}`);
                })
            )
        ]);
    }
    console.log("HTML generation completed.");
}
