import * as db from '../database/index';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import SubforumPage from './pages/SubforumPage';
import ThreadPage from './pages/ThreadPage';

async function generateHTML() {
    // Just get the database connection.  NO interactive prompt here.
    db.getDatabase();

    const distDir = path.join(process.cwd(), 'dist');
    if (!existsSync(distDir)) {
        await fs.mkdir(distDir, { recursive: true });
    }

    const subforums = await db.getSubforums();

    for (const subforum of subforums) {
        const subforumContent = await SubforumPage({ subforum });
        const subforumDir = path.join(distDir, subforum.url.replace(/[^a-zA-Z0-9]/g, '_'));

        if (!existsSync(subforumDir)) {
            await fs.mkdir(subforumDir, { recursive: true });
        }

        await fs.writeFile(path.join(distDir, `${subforum.url.replace(/[^a-zA-Z0-9]/g, '_')}.html`), subforumContent);
        console.log(`Generated page for subforum: ${subforum.title}`);

        const childSubforums = await db.getSubforums(subforum.id);
        for (const childSubforum of childSubforums) {
            const childSubforumContent = await SubforumPage({ subforum: childSubforum });
             await fs.writeFile(path.join(distDir, `${childSubforum.url.replace(/[^a-zA-Z0-9]/g, '_')}.html`), childSubforumContent);
            console.log(`Generated page for subforum: ${childSubforum.title}`);

            const childThreads = await db.getThreadsBySubforum(childSubforum.url);
            for(const thread of childThreads){
                const threadContent = await ThreadPage({ subforum: childSubforum, thread });
                const threadFileName = `${thread.url.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
                const threadFilePath = path.join(subforumDir, threadFileName);
                await fs.writeFile(threadFilePath, threadContent);
                console.log(`Generated page for thread: ${thread.title}`);
            }
        }


        const threads = await db.getThreadsBySubforum(subforum.url);
        for (const thread of threads) {
            const threadContent = await ThreadPage({ subforum, thread });
            const threadFileName = `${thread.url.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
            const threadFilePath = path.join(subforumDir, threadFileName);
            await fs.writeFile(threadFilePath, threadContent);
            console.log(`Generated page for thread: ${thread.title}`);
        }
    }

    console.log("HTML generation completed.");
}
generateHTML().catch(console.error);
