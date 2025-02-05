import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

export const readline = createInterface({ input, output });

export function askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
        readline.question(question, resolve);
    });
}

process.on('SIGINT', () => {
    readline.close();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    readline.close();
    process.exit(1);
});
