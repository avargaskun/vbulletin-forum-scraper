import pino from 'pino'

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      sync: true,
      hideObject: true,
      destination: 1,
      append: false,
    },
  },
})

export { logger as scrapingLogger, logger }

process.on('uncaughtException', console.error)
process.on('unhandledRejection', console.error)
