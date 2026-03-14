import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function auth() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const payload = jwt.verify(token, secret);
    return { user: payload };
  } catch (err) {
    return null;
  }
}
