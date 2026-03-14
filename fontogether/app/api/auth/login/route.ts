import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 내부 통신: docker-compose 상의 'api' 서비스로 요청 (포트 80은 생략 가능하나 명시적으로 적어도 됨)
    // 원래 Nginx가 /api를 라우팅하지만, 여기서는 Next.js 컨테이너 내에서 서버 사이드 렌더링(Backend)으로 직접 요청하는 것이므로 api 서비스 호스트명 사용.
    const backendRes = await fetch("http://api/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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
    
    // Set Access Token Cookie
    res.cookies.set({
      name: "accessToken",
      value: accessToken,
      httpOnly: true,
      path: "/",
      maxAge: 15 * 60, // 15 minutes
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // Set Refresh Token Cookie
    res.cookies.set({
      name: "refreshToken",
      value: refreshToken,
      httpOnly: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}