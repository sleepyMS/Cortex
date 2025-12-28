"use client";

import React from "react";

/**
 * Helper function to format text with bold emphasis (**text**)
 * Converts markdown-style bold to React elements with violet highlight
 */
export const formatText = (
  text: string,
  highlightClass: string = "text-violet-400"
): React.ReactNode => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <span key={index} className={`${highlightClass} font-bold`}>
              {part.slice(2, -2)}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

export default formatText;
