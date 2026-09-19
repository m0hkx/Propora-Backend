// controllers/users.controller.ts

import type { Request, Response } from "express"

export function getUsers(req: Request, res: Response) {
  res.json([
    { id: 1, name: "John" },
    { id: 2, name: "Sarah" }
  ])
}

export function getUser(req: Request, res: Response) {
  res.json({
    id: req.params.id
  })
}

export function insertUser(req: Request, res: Response) {
  
}