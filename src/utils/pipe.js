'use strict';

const pipe = (...stages) => {
    return async (req, res, params) => {
        const initialCtx = {};
        await stages.reduce( async (prev, current) => {
            const ctx = await prev;
            if (res.headersSent) return ctx;
            const nextCtx = await current(req, res, params, ctx);
            return { ...ctx, ...nextCtx };
        }, Promise.resolve(initialCtx))
    }
}

module.exports = pipe