// Mirrors the API's PICK_UNITS_MIN, PICK_UNITS_MAX and PICK_UNITS_STEP, the one stake scale for web, Discord and Telegram.
export const UNITS = { min: 0.5, max: 5, step: 0.5 } as const;

export function isValidUnits(units: number): boolean {
  const steps = units / UNITS.step;
  return (
    units >= UNITS.min &&
    units <= UNITS.max &&
    Math.abs(steps - Math.round(steps)) < 1e-9
  );
}

export const UNITS_HINT = `Units go from ${UNITS.min} to ${UNITS.max} in steps of ${UNITS.step} (1, 1.5, 2).`;
