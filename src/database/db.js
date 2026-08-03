'use strict';

const {Pool} = require('pg');

class Database {
    constructor() {
        this.pool = null;
    }

    async connect() {
        if (this.pool) return this.pool;
        try {
            this.pool = new Pool({
                host: process.env.PG_HOST || 'localhost',
                port: parseInt(process.env.PG_PORT, 10) || 5432,
                user: process.env.PG_USER || 'postgres',
                password: process.env.PG_PASSWORD || 'postgres',
                database: process.env.PG_DB_NAME || 'vanilla_ecomerce',
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000
            });

            await this.pool.query('SELECT NOW()');
            console.log(`[DATABASE]: Successfully connected to PostgreSQL database: "${process.env.PG_DB_NAME || 'vanilla_ecomerce'}"`);

            await this.#initializeSchema();
            return this.pool;
        } catch (error) {
            console.error('[DATABASE ERROR]: PostgreSQL connection failed:', error.message);
            throw error;
        }
    }

    async query(text, params) {
        if (!this.pool) {
            throw new Error('Database not initialized. Call connect() first.');
        }
        return this.pool.query(text, params);
    }

    async #initializeSchema() {
        const createUsersTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'customer' NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
        `;
        await this.pool.query(createUsersTableQuery);
        await this.pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
        console.log('[DATABASE]: Database schema and indexes verified.');
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            console.log('[DATABASE]: PostgreSQL pool closed gracefully.');
        }
    }
}

module.exports = new Database();