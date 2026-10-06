'use strict';

// Public JSON contract of /api/cart — identical to the previous cartHandler output.

const presentCart = ({items, totalPrice}) => ({
  cart: items.map((item) => ({
    item_id: item.itemId,
    product_id: item.productId,
    title: item.title,
    price: item.price,
    quantity: item.quantity,
    total_item_price: item.totalItemPrice.toFixed(2)
  })),
  total_cart_price: totalPrice
});

const presentItemAdded = () => ({message: 'Item added to cart successfully!'});

const presentItemRemoved = () => ({message: 'Item removed from cart'});

module.exports = {presentCart, presentItemAdded, presentItemRemoved};
