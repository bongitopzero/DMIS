// middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  // Check if authorization header exists
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Extract token from header
    token = req.headers.authorization.split(" ")[1];
  }

  // If no token found, reject request
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request object
    req.user = await User.findById(decoded.id).select("-password");

    next(); // allow access
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};
