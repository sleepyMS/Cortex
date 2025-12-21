"use client";

import React from "react";

/** HeroSection의 배경 - 그리드 패턴과 ambient light */
export const HeroBackground = () => {
  return (
    <>
      {/* Grid Background */}
      <div className="fixed inset-0 z-0 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]">
        {/* Violet Ambient Light */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[-10%] h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle_400px_at_50%_300px,rgba(139,92,246,0.15),transparent)]"></div>
        <div className="absolute top-0 right-0 z-[-1] h-screen w-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(139,92,246,0.15),rgba(255,255,255,0))]"></div>
      </div>
    </>
  );
};
