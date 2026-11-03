export interface WashingCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  user_id: string;
  ids?: string[];
}

export function clampWashingRange(start: Date, end: Date, startHour: number, endHour: number) {
  const clampedStart = new Date(start);
  const clampedEnd = new Date(end);

  if (clampedStart.getHours() < startHour) {
    clampedStart.setHours(startHour, 0, 0, 0);
  }

  const latestEnd = new Date(clampedStart);
  latestEnd.setHours(endHour, 0, 0, 0);

  if (clampedEnd > latestEnd) {
    clampedEnd.setTime(latestEnd.getTime());
  }

  if (clampedEnd <= clampedStart) {
    clampedEnd.setTime(clampedStart.getTime() + 60 * 60 * 1000);
    if (clampedEnd > latestEnd) {
      clampedEnd.setTime(latestEnd.getTime());
    }
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
