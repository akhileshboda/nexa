import React from 'react';

const COLORS = [
  ["from-indigo-500", "to-violet-500"],
  ["from-rose-500", "to-orange-400"],
  ["from-emerald-500", "to-teal-400"],
  ["from-sky-500", "to-cyan-400"],
  ["from-fuchsia-500", "to-pink-500"],
  ["from-amber-500", "to-yellow-400"],
];

interface AvatarProps {
  name: string;
  size?: number;
  seed?: number;
}

export default function Avatar({ name, size = 56, seed = 0 }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const color = COLORS[seed % COLORS.length];

  return (
    <div
      className={`grid place-items-center rounded-full text-white select-none bg-gradient-to-br ${color[0]} ${color[1]}`}
      style={{ width: size, height: size, fontSize: size / 2.8 }}
    >
      {initials}
    </div>
  );
}