export const FULL_SCREEN_ATTEMPT = 10;

export function calculateYesGrowth({
  attempt,
  stageWidth,
  stageHeight,
  buttonWidth,
  buttonHeight,
  startXRatio,
  startYRatio
}) {
  const safeAttempt = Math.max(0, Number(attempt) || 0);
  const progress = Math.min(safeAttempt / FULL_SCREEN_ATTEMPT, 1);
  const easedProgress = progress ** 1.65;
  const fullScale = Math.max(stageWidth / buttonWidth, stageHeight / buttonHeight) * 1.12;
  const scale = 1 + (fullScale - 1) * easedProgress;

  const startLeft = startXRatio * stageWidth - buttonWidth / 2;
  const startTop = startYRatio * stageHeight - buttonHeight / 2;
  const centeredLeft = (stageWidth - buttonWidth) / 2;
  const centeredTop = (stageHeight - buttonHeight) / 2;

  return {
    progress,
    scale,
    left: startLeft + (centeredLeft - startLeft) * easedProgress,
    top: startTop + (centeredTop - startTop) * easedProgress
  };
}

export function getSadnessStage(attempt) {
  if (attempt <= 0) return 0;
  if (attempt <= 2) return 1;
  if (attempt <= 4) return 2;
  return 3;
}

export function chooseEscapePoint({
  stageWidth,
  stageHeight,
  buttonWidth,
  buttonHeight,
  currentLeft,
  currentTop,
  margin = 12,
  samples = 14,
  random = Math.random
}) {
  const maxLeft = Math.max(margin, stageWidth - buttonWidth - margin);
  const maxTop = Math.max(margin, stageHeight - buttonHeight - margin);
  let bestPoint = { left: margin, top: margin, distance: -1 };

  for (let index = 0; index < samples; index += 1) {
    const candidate = {
      left: margin + random() * Math.max(0, maxLeft - margin),
      top: margin + random() * Math.max(0, maxTop - margin)
    };
    const distance = (candidate.left - currentLeft) ** 2 + (candidate.top - currentTop) ** 2;
    if (distance > bestPoint.distance) bestPoint = { ...candidate, distance };
  }

  return { left: bestPoint.left, top: bestPoint.top };
}
