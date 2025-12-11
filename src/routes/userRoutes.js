import express from "express";
import { createUsers, loginUser } from "../controllers/userControllers.js";

const router = express.Router();

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     description: Register a new user
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "john_doe"
 *               email:
 *                 type: string
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: User already exists
 */
router.post("/register", createUsers);

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     description: Login a user and return an authentication token
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string 
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: User logged in successfully, returns token
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized, invalid credentials
 */
router.post("/login", loginUser);

export default router;
