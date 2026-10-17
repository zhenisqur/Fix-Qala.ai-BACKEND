export type Category = 'road' | 'light' | 'trash' | 'water' | 'yard';
export type Priority = 'critical' | 'medium' | 'normal';
export type Status = 'new' | 'sent' | 'in_progress' | 'done';

export const CATEGORIES: Category[] = ['road', 'light', 'trash', 'water', 'yard'];
export const STATUSES: Status[] = ['new', 'sent', 'in_progress', 'done'];

export const CLUSTER_RADIUS_M = 100;

export const CATEGORY_LABEL: Record<Category, string> = {
  road: 'Дороги',
  light: 'Освещение',
  trash: 'Мусор',
  water: 'Вода и канализация',
  yard: 'Двор',
};

export const DEPARTMENTS: Record<Category, string> = {
  road: 'Управление дорог и транспорта',
  light: 'Служба городского освещения',
  trash: 'Служба санитарной очистки',
  water: 'Горводоканал',
  yard: 'Служба благоустройства',
};

export const STATUS_TEXT: Record<Status, string> = {
  new: 'принято',
  sent: 'передано в службу',
  in_progress: 'в работе',
  done: 'решено',
};

const BASE_WEIGHT: Record<Category, number> = {
  water: 3,
  road: 2,
  light: 2,
  trash: 1,
  yard: 1,
};

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function computePriority(category: string, confirms: number, escalations = 0): Priority {
  const base = BASE_WEIGHT[category as Category] ?? 1;
  const score = base + Math.floor(confirms / 5) + escalations * 2;
  if (score >= 4) return 'critical';
  if (score >= 2) return 'medium';
  return 'normal';
}