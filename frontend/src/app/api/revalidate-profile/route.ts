// file: src/app/api/revalidate-profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// 이 API는 백엔드(FastAPI) 서버로부터 호출됩니다.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, token } = body;

  // 1. 보안: .env 파일에 저장된 비밀 토큰을 확인합니다.
  if (token !== process.env.NEXT_PUBLIC_REVALIDATION_TOKEN) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  if (!username) {
    return NextResponse.json(
      { message: "Username is required" },
      { status: 400 }
    );
  }

  try {
    // 2. '/profile/[username]' 경로의 캐시를 즉시 무효화합니다.
    revalidatePath(`/profile/${username}`, "page");

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json(
      { message: "Error revalidating" },
      { status: 500 }
    );
  }
}
