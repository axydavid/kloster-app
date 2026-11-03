export interface WashingCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  user_id: string;
  ids?: string[];
}

function lastSelectedHour(selectedEnd: Date) {
  if (selectedEnd.getMinutes() === 0 && selectedEnd.getSeconds() === 0) {
    return selectedEnd.getHours() - 1;
  }
  return selectedEnd.getHours();
}

export function sameWashingSlot(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
    && left.getHours() === right.getHours();
}

export function getWashingConfirmSlotStart(
  selectedEnd: Date | null,
  startHour: number,
  endHour: number
): Date | null {
  if (!selectedEnd) {
    return null;
  }

  const lastRowHour = Math.max(startHour, endHour - 1);
  const confirm = new Date(selectedEnd);
  confirm.setMinutes(0, 0, 0);
  confirm.setHours(lastSelectedHour(selectedEnd));

  // Last row clips the check, so move it one slot up when that row exists.
  if (confirm.getHours() >= lastRowHour && lastRowHour > startHour) {
    confirm.setHours(confirm.getHours() - 1);
  }

  return confirm;
}

export function clampWashingRange(start: Date, end: Date, startHour: number, endHour: number) {
  const clampedStart = new Date(start);
  const clampedEnd = new Date(end);

  if (clampedStart.getHours() < startHour) {
    clampedStart.setHours(startHour, 0, 0, 0);
  }

  const latestStart = new Date(clampedStart);
  latestStart.setHours(Math.max(startHour, endHour - 1), 0, 0, 0);
  if (clampedStart > latestStart) {
    clampedStart.setTime(latestStart.getTime());
  }

  const latestEnd = new Date(clampedStart);
  latestEnd.setHours(endHour, 0, 0, 0);

  if (clampedEnd > latestEnd) {
    clampedEnd.setTime(latestEnd.getTime());
  }

  if (clampedEnd.getHours() === endHour - 1 && (clampedEnd.getMinutes() > 0 || clampedEnd.getSeconds() > 0)) {
    clampedEnd.setHours(endHour, 0, 0, 0);
  }

  if (clampedEnd <= clampedStart) {
    clampedEnd.setTime(Math.min(clampedStart.getTime() + 60 * 60 * 1000, latestEnd.getTime()));
  }

  return { start: clampedStart, end: clampedEnd };
}

export function mergeAdjacentWashingEvents(events: WashingCalendarEvent[]) {
  const sorted = [...events].sort((left, right) => {
    if (left.user_id !== right.user_id) {
      return left.user_id.localeCompare(right.user_id);
    }
    return left.start.getTime() - right.start.getTime();
  });

  return sorted.reduce<WashingCalendarEvent[]>((merged, event) => {
    const previous = merged[merged.length - 1];
    const sameUser = previous?.user_id === event.user_id;
    const sameDay = previous?.start.toDateString() === event.start.toDateString();
    const contiguous = previous && previous.end.getTime() >= event.start.getTime() - 1000;

    if (previous && sameUser && sameDay && contiguous) {
      previous.end = new Date(Math.max(previous.end.getTime(), event.end.getTime()));
      previous.ids = [...(previous.ids || [previous.id]), event.id];
      return merged;
    }

    merged.push({ ...event, ids: [event.id] });
    return merged;
  }, []);
}

export function contrastTextColor(background: string) {
  const hex = background.replace('#', '');
  if (hex.length !== 6) {
    return '#ffffff';
  }
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
}
