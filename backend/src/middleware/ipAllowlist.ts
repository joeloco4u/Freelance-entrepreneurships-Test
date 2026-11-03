import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

export function ipAllowlist(req: Request, res: Response, next: NextFunction) {
	const allowed = env.allowedIps;
	if (allowed.length === 0) return next();

	// Use the leftmost X-Forwarded-For entry (original client IP).
	// Falls back to req.ip for direct connections (local dev).
	const forwarded = req.headers["x-forwarded-for"];
	const clientIp =
		typeof forwarded === "string"
			? (forwarded.split(",")[0]?.trim() ?? "")
			: (req.ip ?? "");

	if (allowed.includes(clientIp)) return next();

	res.status(403).json({ error: "Access denied" });
}
