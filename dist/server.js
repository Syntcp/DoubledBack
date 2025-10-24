"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = __importDefault(require("node:http"));
const app_js_1 = require("./app.js");
const env_js_1 = require("./config/env.js");
const prisma_js_1 = require("./lib/prisma.js");
const logger_js_1 = require("./lib/logger.js");
const app = (0, app_js_1.createApp)();
const server = node_http_1.default.createServer(app);
// Timeouts & keep-alive (robuste derrière proxy)
server.keepAliveTimeout = 75_000;
server.headersTimeout = 76_000;
server.requestTimeout = 60_000;
server.listen(env_js_1.env.PORT, () => {
    logger_js_1.logger.info(`Server on http://localhost:${env_js_1.env.PORT} (${env_js_1.env.NODE_ENV})`);
});
async function closeGracefully(signal) {
    logger_js_1.logger.info(`${signal} received. Closing gracefully...`);
    server.close(async () => {
        try {
            await prisma_js_1.prisma.$disconnect();
            logger_js_1.logger.info('✅ Prisma disconnected');
        }
        catch (e) {
            logger_js_1.logger.error({ e }, 'Error during Prisma disconnect');
        }
        finally {
            logger_js_1.logger.info('✅ HTTP server closed. Bye!');
            process.exit(0);
        }
    });
    setTimeout(() => {
        logger_js_1.logger.error('⏳ Forced exit');
        process.exit(1);
    }, 10_000).unref();
}
process.on('SIGINT', () => closeGracefully('SIGINT'));
process.on('SIGTERM', () => closeGracefully('SIGTERM'));
