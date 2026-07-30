'use strict'

module.exports = class RouterDispatcher {
    constructor(router) {
        this.router = router
    }

    dispatch(req, res) {
        try {
            const [pathname] = req.url.split('?');
            const match = this.router.lookup(req.method, pathname);
            if (match.error === 'METHOD_NOT_ALLOWED') {
                res.writeHead(404);
                res.end(JSON.stringify({error: `Method ${req.method} not allowed`}))
            }
            if (match.error === 'NOT_FOUND') {
                res.writeHead(404);
                return res.end(JSON.stringify({error: `Route ${req.method} ${pathname} not found`}));
            }
            match.handler(req, res, match.params);
        } catch (e) {
            this.#handleError(res, error);
        }
    }

    #handleError(res, error) {
        console.error('[SERVER ERROR]:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        if (!res.headersSent) {
            res.writeHead(500);
            res.end(JSON.stringify({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'production'
                    ? 'Something went wrong'
                    : error.message
            }));
        }
    }
}