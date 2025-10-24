"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_js_1 = require("../lib/logger.js");
function errorHandler(err, _req, res, _next) {
    const status = err.status || 500;
    const payload = {
        error: err.name || 'Error',
        message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message
    };
    if (status >= 500)
        logger_js_1.logger.error({ err }, 'Unhandled error');
    res.status(status).json(payload);
}
