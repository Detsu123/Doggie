import test from "node:test";
import assert from "node:assert/strict";
import {
  FULL_SCREEN_ATTEMPT,
  calculateYesGrowth,
  chooseEscapePoint,
  getSadnessStage
} from "../public/interaction-utils.js";

const geometry = {
  stageWidth: 1000,
  stageHeight: 620,
  buttonWidth: 142,
  buttonHeight: 52,
  startXRatio: 0.4,
  startYRatio: 0.84
};

test("Yes grows after every No attempt", () => {
  const sizes = Array.from({ length: FULL_SCREEN_ATTEMPT + 1 }, (_, attempt) => (
    calculateYesGrowth({ ...geometry, attempt }).scale
  ));

  for (let index = 1; index < sizes.length; index += 1) {
    assert.ok(sizes[index] > sizes[index - 1]);
  }
});

test("Yes covers the full game screen at the final growth step", () => {
  const result = calculateYesGrowth({ ...geometry, attempt: FULL_SCREEN_ATTEMPT });
  assert.equal(result.progress, 1);
  assert.ok(result.scale * geometry.buttonWidth >= geometry.stageWidth);
  assert.ok(result.scale * geometry.buttonHeight >= geometry.stageHeight);
});

test("sadness advances in three visible stages", () => {
  assert.equal(getSadnessStage(0), 0);
  assert.equal(getSadnessStage(1), 1);
  assert.equal(getSadnessStage(3), 2);
  assert.equal(getSadnessStage(5), 3);
  assert.equal(getSadnessStage(99), 3);
});

test("No always escapes to a point inside the full game screen", () => {
  const values = [0.05, 0.1, 0.9, 0.85, 0.2, 0.7, 0.8, 0.15];
  let index = 0;
  const point = chooseEscapePoint({
    stageWidth: 1000,
    stageHeight: 620,
    buttonWidth: 100,
    buttonHeight: 52,
    currentLeft: 480,
    currentTop: 300,
    samples: 4,
    random: () => values[index++ % values.length]
  });

  assert.ok(point.left >= 12 && point.left <= 888);
  assert.ok(point.top >= 12 && point.top <= 556);
  assert.ok(Math.hypot(point.left - 480, point.top - 300) > 250);
});
