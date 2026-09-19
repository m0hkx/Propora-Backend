// controllers/users.controller.ts

import type { Request, Response } from "express"
import { getDatabase } from "../database.js"

export async function getUser(req: Request, res: Response) {
  const database = getDatabase();
  const users = database.collection("users");

  const result = await users.findOne({ username: req.params.id });

  res.json({ result });
}

export async function insertUser(req: Request, res: Response) {
  const database = getDatabase();
  const users = database.collection("users");

  const result = await users.insertOne({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
  });

  res.status(201).json({
    message: "User created successfully",
    userId: result.insertedId
  })
}

export async function loginUser(req: Request, res: Response) {
  const database = getDatabase();
  const users = database.collection("users");

  const user = await users.findOne({
    username: req.body.username,
  });

  if (!user) {
    return res.status(401).json({
      message: "Invalid username or password",
    });
  }

  if (user.password !== req.body.password) {
    return res.status(401).json({
      message: "Invalid username or password",
    });
  }

  req.session.userId = user._id.toString();

  res.json({
    message: "Logged in successfully",
  });
}

export function logoutUser(req: Request, res: Response) {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        message: "Logout field",
      })
    }
  });

  res.json({
    message: "Logged out successfully",
  });
}