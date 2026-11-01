import { describe, it, expect } from "vitest";
import { fifo, lru, optimal } from "./algorithms";
import { adaptive } from "./workload";
import { parseRefs } from "./validation";

const ref = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2];

describe("page replacement", () => {
  it("textbook counts", () => {
    expect(fifo(ref, 3).faults).toBe(10);
    expect(lru(ref, 3).faults).toBe(9);
    expect(optimal(ref, 3).faults).toBe(7);
  });
  it("edge cases", () => {
    expect(fifo([5, 5, 5], 1).faults).toBe(1);
    expect(lru([1, 2, 3], 10).faults).toBe(3);
    expect(optimal([0], 2).hits).toBe(0);
    expect(adaptive(ref, 3).faults).toBeGreaterThanOrEqual(7);
  });
  it("parses", () => {
    expect(parseRefs("1, 2\t3  10")).toEqual({ ok: true, refs: [1, 2, 3, 10] });
    expect(parseRefs("1 a").ok).toBe(false);
    expect(parseRefs("  ").ok).toBe(false);
  });
});
