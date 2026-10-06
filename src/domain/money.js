'use strict';

// Money is calculated in integer cents to avoid floating point drift (0.1 + 0.2 !== 0.3).
// Values coming from Postgres NUMERIC arrive as strings ('10.50'), so both are accepted.

/** @param {number|string} amount */
const toCents = (amount) => Math.round(Number(amount) * 100);

/** @param {number} cents */
const fromCents = (cents) => cents / 100;

module.exports = {toCents, fromCents};
