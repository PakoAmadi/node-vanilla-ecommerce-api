const sanitizeCartData = (rawParams) => {
  return {
    productId: rawParams.productId ? parseInt(rawParams.productId, 10) : null,
    quantity: rawParams.quantity !== undefined ? parseInt(rawParams.quantity, 10) : 1
  };
};

module.exports = sanitizeCartData