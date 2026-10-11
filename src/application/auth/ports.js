'use strict';

/**
 * Ports for authentication and user profile use cases.
 *
 * @typedef {object} UserRecord
 * @property {number} id
 * @property {string} name
 * @property {string} email
 * @property {string} role           'customer' | 'admin'
 * @property {Date} createdAt
 *
 * @typedef {UserRecord & {passwordHash:string}} UserWithCredentials
 *
 * @typedef {object} UserRepository
 * @property {(data:{name:string,email:string,passwordHash:string}) => Promise<UserRecord>} create
 *           throws EmailAlreadyTakenError on duplicate email
 * @property {(email:string) => Promise<UserWithCredentials|null>} findByEmail
 * @property {(id:number) => Promise<UserRecord|null>} findById
 *
 * @typedef {object} PasswordHasher
 * @property {(plain:string) => Promise<string>} hash
 * @property {(plain:string, hash:string|null) => Promise<boolean>} verify
 *           With hash === null it must still spend the same time and return false,
 *           so a response time does not reveal whether the email exists.
 *
 * @typedef {object} TokenService
 * @property {(payload:{id:number, role:string}) => string} issue
 * @property {(token:string) => ({id:number, role:string}|null)} verify   null if invalid/expired
 */

module.exports = {};
