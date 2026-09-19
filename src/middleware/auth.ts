import type { Request, Response, NextFunction } from "express";

export async function protect(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  next();
}