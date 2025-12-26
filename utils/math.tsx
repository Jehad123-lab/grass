/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

// --- PERLIN NOISE IMPLEMENTATION ---
// A compact, self-contained implementation for procedural generation

const PERM = new Uint8Array(512);
const P = new Uint8Array(256);

// Initialize permutation table
for (let i = 0; i < 256; i++) P[i] = i;
// Shuffle
for (let i = 255; i > 0; i--) {
  const r = Math.floor(Math.random() * (i + 1));
  const t = P[i];
  P[i] = P[r];
  P[r] = t;
}
// Duplicate for overflow
for (let i = 0; i < 512; i++) PERM[i] = P[i & 255];

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (t: number, a: number, b: number) => a + t * (b - a);
const grad = (hash: number, x: number, y: number, z: number) => {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
};

export const noise2D = (x: number, y: number): number => {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;

  x -= Math.floor(x);
  y -= Math.floor(y);

  const u = fade(x);
  const v = fade(y);

  const A = PERM[X] + Y;
  const B = PERM[X + 1] + Y;

  return lerp(v, 
    lerp(u, grad(PERM[A], x, y, 0), grad(PERM[B], x - 1, y, 0)),
    lerp(u, grad(PERM[A + 1], x, y - 1, 0), grad(PERM[B + 1], x - 1, y - 1, 0))
  );
};
