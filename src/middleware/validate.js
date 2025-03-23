const { body } = require('express-validator');

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
  body('phone').optional().isMobilePhone()
];

const updateProfileValidation = [
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 6 }),
  body('name').optional().trim().notEmpty(),
  body('phone').optional().isMobilePhone(),
  body('address.zipCode').optional().isPostalCode()
];

module.exports = {
  registerValidation,
  updateProfileValidation
}; 