export type ParticleShape = "dot" | "star" | "shard";

export type BurstParticleSpec = {
  id: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
  shape: ParticleShape;
};

export type ConfettiSpec = {
  id: number;
  x: number;
  delay: number;
  size: number;
  drift: number;
  colorIndex: number;
};

/** 黄金角分布，粒子从中心向外爆发 */
export function buildBurstParticles(
  count: number,
  bias: ParticleShape | "mixed" = "mixed",
): BurstParticleSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const golden = ((i + 1) * 0.6180339887) % 1;
    let shape: ParticleShape = "dot";
    if (bias === "star") shape = i % 4 === 0 ? "star" : "dot";
    else if (bias === "shard") shape = i % 3 === 0 ? "shard" : "dot";
    else if (bias === "dot") shape = "dot";
    else shape = i % 5 === 0 ? "star" : i % 3 === 0 ? "shard" : "dot";
    return {
      id: i,
      angle: golden * Math.PI * 2,
      distance: 100 + (i % 8) * 32 + golden * 40,
      size: 4 + (i % 5) * 2.5,
      delay: (i % 12) * 0.025,
      shape,
    };
  });
}

export function buildConfettiParticles(count: number): ConfettiSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: ((i * 0.173) % 1) * 2 - 1,
    delay: (i % 10) * 0.04,
    size: 6 + (i % 4) * 3,
    drift: ((i % 7) - 3) * 18,
    colorIndex: i % 4,
  }));
}
