import { clampWashingRange, getWashingConfirmSlotStart } from './washingEvents';

describe('getWashingConfirmSlotStart', () => {
  it('keeps the check on the last selected hour when that is not the last row', () => {
    const selectedEnd = new Date(2026, 10, 5, 20, 0, 0);
    const confirmStart = getWashingConfirmSlotStart(selectedEnd);

    expect(confirmStart?.getHours()).toBe(19);
  });

  it('keeps the check on the last calendar row', () => {
    const selectedEnd = new Date(2026, 10, 5, 22, 0, 0);
    const confirmStart = getWashingConfirmSlotStart(selectedEnd);

    expect(confirmStart?.getHours()).toBe(21);
  });

  it('keeps the check on the last row when the slot ends at xx:59', () => {
    const selectedEnd = new Date(2026, 10, 5, 21, 59, 0);
    const confirmStart = getWashingConfirmSlotStart(selectedEnd);

    expect(confirmStart?.getHours()).toBe(21);
  });
});

describe('clampWashingRange', () => {
  it('snaps a last-row xx:59 end to the washing end hour', () => {
    const start = new Date(2026, 10, 5, 21, 0, 0);
    const end = new Date(2026, 10, 5, 21, 59, 0);
    const range = clampWashingRange(start, end, 8, 22);

    expect(range.start.getHours()).toBe(21);
    expect(range.end.getHours()).toBe(22);
    expect(range.end.getMinutes()).toBe(0);
  });
});
