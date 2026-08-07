import React from "react";

interface Props {
  text: string;
  matches?: { key: string; indices: [number, number][] }[];
  targetKey: string;
}

export const HighlightedText = React.memo(({ text, matches, targetKey }: Props) => {
  if (!matches || !text) return <>{text}</>;

  const relevantMatch = matches.find(m =>
    m.key === targetKey ||
    m.key === `normalized${targetKey.charAt(0).toUpperCase() + targetKey.slice(1)}`
  );

  if (!relevantMatch || !relevantMatch.indices.length) return <>{text}</>;

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  const sortedIndices = [...relevantMatch.indices].sort((a, b) => a[0] - b[0]);

  sortedIndices.forEach(([start, end], i) => {
    const safeStart = Math.min(start, text.length);
    const safeEnd = Math.min(end + 1, text.length);

    if (safeStart > lastIndex) {
      result.push(<span key={`text-${i}`}>{text.slice(lastIndex, safeStart)}</span>);
    }
    if (safeStart < safeEnd) {
      result.push(
        <mark key={`match-${i}`} className="bg-primary/25 text-primary font-semibold rounded-sm px-0.5 mx-px">
          {text.slice(safeStart, safeEnd)}
        </mark>
      );
    }
    lastIndex = safeEnd;
  });

  if (lastIndex < text.length) {
    result.push(<span key="remaining">{text.slice(lastIndex)}</span>);
  }

  return <>{result}</>;
});
