const { validationResult } = require("express-validator");

/**
 * Runs after an array of express-validator chains and short-circuits
 * the request with a 422 if any of them failed.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
  }
  next();
}

module.exports = validate;
