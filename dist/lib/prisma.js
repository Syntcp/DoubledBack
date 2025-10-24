"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_js_1 = require("./logger.js");
const base = global.__PRISMA_BASE__ ?? new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error']
});
exports.prisma = base.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const start = Date.now();
                const result = await query(args);
                const dur = Date.now() - start;
                if (dur > 200) {
                    logger_js_1.logger.warn({ model, operation, dur }, 'Prisma slow op');
                }
                return result;
            }
        }
    }
});
if (process.env.NODE_ENV !== 'production')
    global.__PRISMA_BASE__ = base;
