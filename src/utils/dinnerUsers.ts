export interface DinnerUserSnapshot {
  id: string;
  displayName?: string;
  iconColor?: string;
  portions?: number | string;
  isTakeAway?: boolean;
  isAutomaticallySet?: boolean;
  isNameSnapshot?: boolean;
}

export interface ResolvedDinnerUser {
  id: string;
  email?: string;
  raw_user_meta_data: {
    display_name?: string;
    iconColor?: string;
    [key: string]: any;
  };
}

export function isGuestId(id?: string) {
  return Boolean(id && id.startsWith('guest-'));
}

export function isVisibleAttendant(attendant: DinnerUserSnapshot) {
  return Boolean(attendant?.id) && !isGuestId(attendant.id) && !attendant.isNameSnapshot;
}

export function getGuestNames(attendants: Array<{
  id?: string;
  guestNames?: string;
  guestName?: string;
  displayName?: string;
}> = []) {
  const guests = attendants.filter(attendant => isGuestId(attendant.id));
  const groupNames = guests.find(guest => guest.guestNames?.trim())?.guestNames?.trim();
  if (groupNames) {
    return groupNames;
  }
  const individualNames = guests
    .map(guest => guest.guestName?.trim() || guest.displayName?.trim())
    .filter(Boolean);
  return individualNames.join(', ');
}

export function getGuestLabel(attendants: Array<{
  id?: string;
  guestNames?: string;
  guestName?: string;
  displayName?: string;
}> = []) {
  const guestCount = attendants.filter(attendant => isGuestId(attendant.id)).length;
  if (guestCount === 0) {
    return '';
  }
  const names = getGuestNames(attendants);
  if (names) {
    return guestCount > 1 ? `${names} (${guestCount})` : names;
  }
  return guestCount > 1 ? `Guests (${guestCount})` : 'Guest';
}

export function localDateString(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function getUserSnapshotFields(user?: ResolvedDinnerUser | null) {
  return {
    displayName: user?.raw_user_meta_data?.display_name || user?.email?.split('@')[0] || undefined,
    iconColor: user?.raw_user_meta_data?.iconColor || user?.raw_user_meta_data?.icon_color || undefined
  };
}

export async function preserveUserDinnerNames(
  client: { from: (table: string) => any },
  userId: string,
  displayName?: string,
  iconColor?: string
) {
  const today = localDateString();
  const { data: days, error } = await client
    .from('dinner_days')
    .select('date, cooks, attendants')
    .lt('date', today);

  if (error) {
    throw error;
  }

  const name = displayName || 'Former member';

  for (const day of days || []) {
    const cooks = Array.isArray(day.cooks) ? day.cooks : [];
    const attendants = Array.isArray(day.attendants) ? [...day.attendants] : [];
    const isCook = cooks.includes(userId);
    const attendantIndex = attendants.findIndex((attendant: DinnerUserSnapshot) => attendant.id === userId);

    if (!isCook && attendantIndex === -1) {
      continue;
    }

    if (attendantIndex !== -1) {
      attendants[attendantIndex] = {
        ...attendants[attendantIndex],
        displayName: name,
        iconColor
      };
    } else {
      attendants.push({
        id: userId,
        portions: 0,
        isTakeAway: false,
        isAutomaticallySet: false,
        isNameSnapshot: true,
        displayName: name,
        iconColor
      });
    }

    const { error: updateError } = await client
      .from('dinner_days')
      .update({ attendants })
      .eq('date', day.date);

    if (updateError) {
      throw updateError;
    }
  }
}

export function resolveDinnerUser(
  users: ResolvedDinnerUser[] | undefined,
  userId: string,
  snapshots: DinnerUserSnapshot[] = []
): ResolvedDinnerUser {
  const liveUser = users?.find(user => user.id === userId);
  if (liveUser) {
    return liveUser;
  }

  const snapshot = snapshots.find(entry => entry.id === userId);
  return {
    id: userId,
    raw_user_meta_data: {
      display_name: snapshot?.displayName || 'Former member',
      iconColor: snapshot?.iconColor || '#6B7280'
    }
  };
}
