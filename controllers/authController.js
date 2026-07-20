const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const { ApiError } = require("../middleware/errorHandler");
const { signAuthToken, signResetToken, verifyResetToken } = require("../services/tokenService");
const logger = require("../utils/logger");

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const employer = await prisma.employer.findUnique({
    where: { email: email.toLowerCase() },
    include: { company: true }
  });

  if (!employer || !employer.isActive) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const isMatch = await bcrypt.compare(password, employer.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password.");
  }

  await prisma.employer.update({
    where: { id: employer.id },
    data: { lastLoginAt: new Date() }
  });

  const token = signAuthToken(employer);
  delete employer.passwordHash;

  logger.info(`Employer login: ${employer.email}`);

  res.json({
    success: true,
    message: "Login successful.",
    data: { token, employer }
  });
});

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { fullName, companyName, email, password } = req.body;

  const existingEmployer = await prisma.employer.findUnique({ where: { email: email.toLowerCase() } });
  if (existingEmployer) {
    throw new ApiError(409, "An account with that email already exists.");
  }

  const company = await prisma.company.create({
    data: {
      name: companyName,
      botGreetingEn: "Welcome to Niajiri. Let's find your next great hire.",
      botGreetingSw: "Karibu Niajiri. Tuwekee kazi yako mpya.",
      botLanguageDefault: "EN"
    }
  });

  const salt = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  const passwordHash = await bcrypt.hash(password, salt);

  const employer = await prisma.employer.create({
    data: {
      companyId: company.id,
      fullName,
      email: email.toLowerCase(),
      passwordHash,
      role: "RECRUITER"
    },
    include: { company: true }
  });

  const token = signAuthToken(employer);
  delete employer.passwordHash;

  logger.info(`Employer registered: ${employer.email}`);

  res.status(201).json({
    success: true,
    message: "Registration successful.",
    data: { token, employer }
  });
});

// POST /api/auth/logout
// Stateless JWT — logout is handled client-side by discarding the token.
// This endpoint exists for a consistent API contract and future token-blacklisting.
const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: "Logged out successfully." });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { employer: req.employer } });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const employer = await prisma.employer.findUnique({ where: { email: email.toLowerCase() } });

  // Always respond the same way, whether or not the account exists,
  // to avoid leaking which emails are registered.
  if (employer) {
    const resetToken = signResetToken(employer);
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    await prisma.employer.update({
      where: { id: employer.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    });

    // In production this would be emailed via a transactional mail provider.
    // Logged here so the reset flow is fully testable end-to-end without SMTP.
    logger.info(`Password reset requested for ${employer.email}. Reset token (send via email): ${resetToken}`);
  }

  res.json({
    success: true,
    message: "If an account exists for that email, a password reset link has been sent."
  });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  let decoded;
  try {
    decoded = verifyResetToken(token);
  } catch {
    throw new ApiError(400, "Reset link is invalid or has expired.");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const employer = await prisma.employer.findFirst({
    where: {
      id: decoded.id,
      resetToken: hashedToken,
      resetTokenExpiry: { gt: new Date() }
    }
  });

  if (!employer) {
    throw new ApiError(400, "Reset link is invalid or has expired.");
  }

  const salt = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await prisma.employer.update({
    where: { id: employer.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null }
  });

  logger.info(`Password reset completed for ${employer.email}`);

  res.json({ success: true, message: "Password has been reset. You can now log in." });
});

module.exports = { login, register, logout, getMe, forgotPassword, resetPassword };
