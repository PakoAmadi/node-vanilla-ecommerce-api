'use strict';

import {BadRequestError, PayloadTooLargeError} from "../errors/errors";

const MAX_BODY_SIZE = 1024 * 1024;

const receiveArgs = async (req) => {
    const buffers = [];
    let currentSize = 0;

    try {
        for await (const chunk of req) {
            currentSize += chunk.length;
            if (currentSize > MAX_BODY_SIZE) {
                throw new PayloadTooLargeError();
            }
            buffers.push(chunk);
        }
        const data = Buffer.concat(buffers).toString();
        if (!data.trim()) return {};
        return JSON.parse(data);

    } catch (error) {
        if (error.statusCode) throw error;
        throw new BadRequestError('Invalid JSON payload');
    }
}

module.exports = receiveArgs()