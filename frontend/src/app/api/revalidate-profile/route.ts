// file: frontend/src/app/api/revalidate-profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, token } = body;

  // 2. 보안 토큰 검사
  if (token !== process.env.REVALIDATE_TOKEN) {
    console.warn("Invalid revalidation token received.");
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  if (!username) {
    return NextResponse.json(
      { message: "Username is required" },
      { status: 400 }
    );
  }

  try {
    // 3. 'page.tsx'의 fetch에 설정한 '태그'를 무효화
    const tag = `profile-${username}`;
    revalidateTag(tag);

    // 4. 대표 전략이 변경되었을 수 있으므로,
    //    이전 대표 전략의 캐시도 함께 지워주는 것이 좋습니다.
    //    (지금은 프로필만 지워도 연쇄적으로 갱신되니 일단 보류)

    console.log(`Revalidated tag successfully: ${tag}`);

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    console.error("Error revalidating tag:", err);
    return NextResponse.json(
      { message: "Error revalidating" },
      { status: 500 }
    );
  }
}
