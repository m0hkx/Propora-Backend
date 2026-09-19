// controllers/users.controller.ts

import type { Request, Response } from "express"
import bcrypt from "bcryptjs";
import { ObjectId, type Document, type WithId } from "mongodb";
import { getDatabase } from "../database.js"

const SALT_ROUNDS = 10;

function toUser(doc: WithId<Document>) {
  return { id: doc._id.toString(), name: doc.username as string, email: doc.email as string };
}

export async function getUser(req: Request, res: Response) {
  const database = getDatabase();
  const users = database.collection("users");

  const result = await users.findOne(
    { username: req.params.id },
    { projection: { password: 0 } }
  );

  res.json({ result });
}

export async function insertUser(req: Request, res: Response) {
  const database = getDatabase();
  const users = database.collection("users");

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      message: "Username, email and password are required",
    });
  }

  const existing = await users.findOne({
    $or: [{ username }, { email }],
  });

  if (existing) {
    return res.status(409).json({
      message: "Username or email already in use",
    });
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await users.insertOne({
    username,
    email,
    password: hashed,
  });

  req.session.userId = result.insertedId.toString();

  res.status(201).json({
    message: "User created successfully",
    user: { id: result.insertedId.toString(), name: username as string, email: email as string },
  })
}

export async function loginUser(req: Request, res: Response) {
  const database = getDatabase();
  const users = database.collection("users");

  const user = await users.findOne({
    $or: [
      { username: req.body.username },
      { email: req.body.email },
    ],
  });

  if (!user) {
    return res.status(401).json({
      message: "Invalid username or password",
    });
  }

  const passwordMatches = await bcrypt.compare(req.body.password ?? "", user.password);

  if (!passwordMatches) {
    return res.status(401).json({
      message: "Invalid username or password",
    });
  }

  req.session.userId = user._id.toString();

  res.json({
    message: "Logged in successfully",
    user: toUser(user),
  });
}

export function logoutUser(req: Request, res: Response) {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        message: "Logout failed",
      })
    }

    res.clearCookie("connect.sid");
    res.json({
      message: "Logged out successfully",
    });
  });
}

export async function getSession(req: Request, res: Response) {
  if (!req.session.userId) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  const database = getDatabase();
  const users = database.collection("users");

  const user = await users.findOne({ _id: new ObjectId(req.session.userId) });

  if (!user) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  res.json({
    user: toUser(user),
  });
}
