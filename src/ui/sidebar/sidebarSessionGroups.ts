import type { SidebarFilterTab, SidebarSessionSummary } from './types';

export interface SessionRecencyGroup {
  label: string;
  sessions: SidebarSessionSummary[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function groupSessionsByRecency(
  sessions: SidebarSessionSummary[],
  now = Date.now()
): SessionRecencyGroup[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayStart = startOfToday.getTime();
  const weekStart = todayStart - 6 * DAY_MS;

  const today: SidebarSessionSummary[] = [];
  const last7: SidebarSessionSummary[] = [];
  const older: SidebarSessionSummary[] = [];

  const sorted = [...sessions].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  for (const session of sorted) {
    const time = session.updatedAt || 0;
    if (time >= todayStart) today.push(session);
    else if (time >= weekStart) last7.push(session);
    else older.push(session);
  }

  const groups: SessionRecencyGroup[] = [];
  if (today.length) groups.push({ label: 'Today', sessions: today });
  if (last7.length) groups.push({ label: 'Last 7 Days', sessions: last7 });
  if (older.length) groups.push({ label: 'Older', sessions: older });
  return groups;
}

export function partitionSessionsByFilter(
  sessions: SidebarSessionSummary[],
  filter: SidebarFilterTab = 'all'
): {
  running: SidebarSessionSummary[];
  pinned: SidebarSessionSummary[];
  recent: SidebarSessionSummary[];
} {
  const running: SidebarSessionSummary[] = [];
  const pinned: SidebarSessionSummary[] = [];
  const recent: SidebarSessionSummary[] = [];

  for (const s of sessions) {
    if (s.isRunning) {
      running.push(s);
    } else if (s.isPinned) {
      pinned.push(s);
    }

    if (filter === 'running') {
      if (s.isRunning) recent.push(s);
    } else if (filter === 'pinned') {
      if (s.isPinned) recent.push(s);
    } else if (filter === 'all') {
      if (!s.isPinned && !s.isRunning) recent.push(s);
    }
  }

  return { running, pinned, recent };
}
