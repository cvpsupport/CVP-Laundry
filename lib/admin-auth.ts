import { createHash, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "cvp_laundry_admin";

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function expectedSessionToken() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return hashValue(`cvp-laundry-admin:v1:${password}`);
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function validateAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(hashValue(password), hashValue(expected));
}

export function isAdminAuthenticated(request: NextRequest) {
  const expected = expectedSessionToken();
  const provided = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!expected || !provided) return false;
  return safeEqual(provided, expected);
}

export function getAdminSessionToken() {
  return expectedSessionToken();
}
