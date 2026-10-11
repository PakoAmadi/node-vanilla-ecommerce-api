'use strict';

// Public JSON contract of /api/products — identical to the previous productHandler output.

const listItem = (p) => ({
  id: p.id, title: p.title, description: p.description, price: p.price, stock: p.stock, image_url: p.imageUrl
});

const full = (p) => ({...listItem(p), created_at: p.createdAt});

const presentProductList = (products) => ({products: products.map(listItem)});
const presentProduct = (product) => listItem(product);
const presentProductCreated = (product) => ({message: 'Product added successfully', product: full(product)});
const presentProductUpdated = (product) => ({message: 'Product updated successfully', product: full(product)});
const presentProductDeleted = () => ({message: 'Product deleted successfully!'});

module.exports = {
  presentProductList, presentProduct, presentProductCreated, presentProductUpdated, presentProductDeleted
};
