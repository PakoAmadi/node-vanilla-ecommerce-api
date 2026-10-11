'use strict';

// Shape-level normalisation of the JSON body. Business rules (ranges, required fields)
// are checked by the domain (Product.validate), so this only coerces obvious types.

const toNumberOrRaw = (value) =>
  typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)) ? Number(value) : value;

const sanitizeProductData = (raw) => ({
  title: typeof raw.title === 'string' ? raw.title.trim() : raw.title,
  description: typeof raw.description === 'string' ? raw.description.trim() : raw.description,
  price: toNumberOrRaw(raw.price),
  stock: toNumberOrRaw(raw.stock)
});

module.exports = sanitizeProductData;
