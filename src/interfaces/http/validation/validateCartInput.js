const {ValidationError} = require("../errors");

const validateCartInput = (data) => {
  const { productId, quantity } = data;
  const errors = {};

  if (!productId || isNaN(productId) || productId <= 0) {
    errors.productId = 'Valid Product ID is required';
  }

  if (isNaN(quantity) || quantity <= 0) {
    errors.quantity = 'Quantity must be a positive integer greater than 0';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }
};

module.exports = validateCartInput