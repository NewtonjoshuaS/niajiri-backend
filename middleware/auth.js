const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

/**
 * Verifies the Bearer JWT on protected employer-portal routes and
 * attaches the authenticated employer (without passwordHash) to req.employer.
 */
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const employer = await prisma.employer.findUnique({
      where: { id: decoded.id },
      include: { company: true }
    });

    if (!employer || !employer.isActive) {
      return res.status(401).json({ success: false, message: "Account not found or deactivated." });
    }

    delete employer.passwordHash;
    req.employer = employer;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Not authorized. Invalid or expired token." });
  }
}

/** Restricts a route to specific employer roles (e.g. OWNER only). */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.employer || !roles.includes(req.employer.role)) {
      return res.status(403).json({ success: false, message: "You do not have permission to perform this action." });
    }
    next();
  };
}

module.exports = { protect, requireRole };
