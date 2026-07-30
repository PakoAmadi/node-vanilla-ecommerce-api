'use strict'

const fs = require('node:fs');
const path = require('node:path');

const loadEnv = () => {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) return;
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const lines = envContent.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=').trim();

            if (key) {
                process.env[key.trim()] = value.replace(/(^["']|["']$)/g, '');
            }
        }

    } catch (e) {
        console.log('.env file loading error', e.message)
    }
}

module.exports = loadEnv