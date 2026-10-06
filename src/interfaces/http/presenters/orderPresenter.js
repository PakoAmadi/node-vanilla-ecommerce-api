'use strict';

// Converts domain/application results into the public JSON contract.
// The shape is kept identical to the previous orderHandler responses.

const presentPlacedOrder = (order) => ({
  message: 'Order placed successfully!',
  order: {
    id: order.id,
    totalPrice: Number(order.totalPrice),
    status: order.status,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({title: i.title, price: Number(i.price), quantity: i.quantity}))
  }
});

const presentOrderHistory = (orders) => ({orders});

module.exports = {presentPlacedOrder, presentOrderHistory};
