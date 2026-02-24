// routes/auth.js
import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import auth from "../middleware/auth.js";

const router = express.Router();

// Register
// Register
router.post("/register", async (req, res) => {
  console.log("Register request body:", req.body); // debug log
  const { name, email, password, role } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    console.log("Login successful for user:", user.email, "Role:", user.role);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role, // Ensure role is returned from database
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users (Admin only)
router.get("/users", auth, async (req, res) => {
  console.log("GET /users endpoint hit");
  console.log("Request user:", req.user);
  
  try {
    const requestingUser = await User.findById(req.user.id);
    console.log("Requesting user from DB:", requestingUser);
    
    // Only administrators can access user list
    if (requestingUser.role !== "Administrator") {
      return res.status(403).json({ error: "Access denied. Administrator role required." });
    }

    const users = await User.find().select('-password');
    console.log(`Found ${users.length} users`);
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update user (Admin only)
router.put("/users/:id", auth, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.id);
    
    // Only administrators can update users
    if (requestingUser.role !== "Administrator") {
      return res.status(403).json({ error: "Access denied. Administrator role required." });
    }

    const { name, email, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete user (Admin only)
router.delete("/users/:id", auth, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.id);
    
    // Only administrators can delete users
    if (requestingUser.role !== "Administrator") {
      return res.status(403).json({ error: "Access denied. Administrator role required." });
    }

    // Prevent deleting yourself
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
