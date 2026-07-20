const jwt = require("jsonwebtoken");

function signAuthToken(employer) {
  return jwt.sign({ id: employer.id, role: employer.role, companyId: employer.companyId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

function signResetToken(employer) {
  return jwt.sign({ id: employer.id, purpose: "password_reset" }, process.env.JWT_RESET_SECRET, {
    expiresIn: process.env.JWT_RESET_EXPIRES_IN || "1h"
  });
}

function verifyResetToken(token) {
  return jwt.verify(token, process.env.JWT_RESET_SECRET);
}

module.exports = { signAuthToken, signResetToken, verifyResetToken };
