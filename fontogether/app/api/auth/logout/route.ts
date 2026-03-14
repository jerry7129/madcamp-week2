import { NextResponse } from "next/server";
import { cookies } from "next/headers"; // ✨ 반드시 next/headers에서 가져와야 합니다.

export async function POST() {
  // 1. 서버의 쿠키 저장소에 접근합니다.
  const cookieStore = await cookies();
  
  // 2. 'accessToken'이라는 이름의 쿠키를 흔적도 없이 삭제합니다.
  cookieStore.delete("accessToken");

  // 3. 성공 응답을 보냅니다.
  return NextResponse.json({ ok: true, message: "로그아웃 성공" });
}