import morgan from 'morgan';
import type { Request, Response, NextFunction } from 'express';

// Format log màu sắc cho terminal
morgan.token('body', (req: Request) => {
    if (req.method === 'POST' && req.body) {
        return JSON.stringify(req.body);
    }
    return '';
});

// HTTP request logger
export const httpLogger = morgan((tokens, req, res) => {
    const status = Number(tokens.status(req, res));
    const statusColor = status >= 500 ? '\x1b[31m' // đỏ
        : status >= 400 ? '\x1b[33m'               // vàng
        : status >= 200 ? '\x1b[32m'               // xanh
        : '\x1b[0m';

    return [
        '\x1b[36m' + tokens.method(req, res) + '\x1b[0m', // cyan
        tokens.url(req, res),
        statusColor + status + '\x1b[0m',
        tokens['response-time'](req, res) + 'ms',
        tokens.body(req, res) ? `| body: ${tokens.body(req, res)}` : '',
    ].filter(Boolean).join(' ');
});

// Error logger
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('\x1b[31m[ERROR]\x1b[0m', new Date().toISOString());
    console.error('  Route  :', req.method, req.url);
    console.error('  Body   :', JSON.stringify(req.body));
    console.error('  Message:', err.message);
    console.error('  Stack  :', err.stack);
    next(err);
};