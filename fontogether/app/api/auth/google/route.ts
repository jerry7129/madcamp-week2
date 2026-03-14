import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(request: Request) {
  try {
    const { code, redirectUri } = await request.json();

    // Send code to Spring Boot for verification
    const backendRes = await fetch("http://api/api/auth/google/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri }),
    });

    if (!backendRes.ok) {
      const text = await backendRes.text();
      return NextResponse.json({ error: text }, { status: backendRes.status });
    }

    const user = await backendRes.json();

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, nickname: user.nickname },
      secret,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, nickname: user.nickname, isRefreshToken: true },
      secret,
      { expiresIn: "7d" }
    );

    const res = NextResponse.json({ user });
    
    res.cookies.set({
      name: "accessToken",
      value: accessToken,
      httpOnly: true,
      path: "/",
      maxAge: 15 * 60,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    res.cookies.set({
      name: "refreshToken",
      value: refreshToken,
      httpOnly: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (err) {
    console.error("Google Auth Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
