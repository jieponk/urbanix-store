import { cookies } from 'next/headers';
import { cache } from 'react';
import { getStoreSettings } from '@/lib/api';
import { DEFAULT_EVENT_CONFIG, EVENT_KEYS, resolveEvent, type EventConfig, type EventKey, type EventState } from '@/lib/events';

export const EVENT_PREVIEW_COOKIE = 'urbanix-event-preview';

/** Status event untuk request ini (satu kali ambil pengaturan per request). */
export const getEventState = cache(async (): Promise<EventState> => {
  const settings = await getStoreSettings();
  const config: EventConfig = { ...DEFAULT_EVENT_CONFIG, ...((settings as { event?: Partial<EventConfig> } | null)?.event ?? {}) };
  let preview: EventKey | null = null;
  try {
    const value = cookies().get(EVENT_PREVIEW_COOKIE)?.value as EventKey | undefined;
    preview = value && EVENT_KEYS.includes(value) ? value : null;
  } catch {
    preview = null;
  }
  return resolveEvent(config, preview);
});
