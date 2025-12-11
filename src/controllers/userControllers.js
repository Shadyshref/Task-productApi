import { prisma } from "../../lib/prisma.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
export async function createUsers(req, res) {
  const { name, email, password, role } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "USER",
      },
    });
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "8d" }
    );
    res.cookie("jwt", token, {
      maxAge: 8 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
    });
    res.status(201).json({ message: "created user succefuly", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating user" });
  }
}

export async function loginUser(req, res) {
  const {email, password } = req.body;
  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required" });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const ispasswordvalid = await bcrypt.compare(password, user.password);
    if (!ispasswordvalid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8d" }
    );
    res.cookie("jwt", token, {
      maxAge: 8 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
    });
    res.status(200).json({ message: "login successful", user: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "error logging " });
  }
}
