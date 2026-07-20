const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const { login, register, logout, getMe, forgotPassword, resetPassword } = require("../controllers/authController");

router.post(
  "/login",
  [body("email").isEmail().withMessage("A valid email is required."), body("password").notEmpty().withMessage("Password is required.")],
  validate,
  login
);

router.post(
  "/register",
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required."),
    body("companyName").trim().notEmpty().withMessage("Company name is required."),
    body("email").isEmail().withMessage("A valid email is required."),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
  ],
  validate,
  register
);

router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("A valid email is required.")],
  validate,
  forgotPassword
);

router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required."),
    body("newPassword").isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
  ],
  validate,
  resetPassword
);

module.exports = router;
