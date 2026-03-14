import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(request: Request) {
  try {
    const refreshToken = request.headers.get('cookie')
      ?.split(';')
      .find(c => c.trim().startsWith('refreshToken='))
      ?.split('=')[1];

    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token not found" }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, secret) as any;

    if (!decoded.isRefreshToken) {
      return NextResponse.json({ error: "Invalid token type" }, { status: 401 });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email, nickname: decoded.nickname },
      secret,
      { expiresIn: "15m" }
    );

    const res = NextResponse.json({ message: "Token refreshed successfully" });

    // Set new Access Token Cookie
    res.cookies.set({
      name: "accessToken",
      value: newAccessToken,
      httpOnly: true,
      path: "/",
      maxAge: 15 * 60, // 15 minutes
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (err) {
    console.error("Token Refresh Error:", err);
    return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
  }
}
