interface HomePageProps {
  subforums: Array<{
    title: string
    url: string
    description?: string
  }>
}

export default async function HomePage({ subforums }: HomePageProps) {
  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Forum Home</title>
            <link rel="stylesheet" href="styles.css">
        </head>
        <body>
            <header>
                <h1>Forum Home</h1>
            </header>
            <main>
                <nav class="subforum-list">
                    <h2>Subforums</h2>
                    <ul>
                        ${subforums
                          .map(
                            (subforum) => `
                            <li>
                                <a href="${subforum.url.replace(/[^a-zA-Z0-9]/g, '_')}.html">
                                    ${subforum.title}
                                </a>
                                ${subforum.description ? `<p>${subforum.description}</p>` : ''}
                            </li>
                        `
                          )
                          .join('')}
                    </ul>
                </nav>
            </main>
            <footer>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
            </footer>
        </body>
        </html>
    `
}
