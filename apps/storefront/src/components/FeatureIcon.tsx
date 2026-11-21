export type FeatureIconName =
  | 'bolt'
  | 'shield'
  | 'tag'
  | 'lock'
  | 'chat'
  | 'box'
  | 'doc'
  | 'list';

import TablerIcon, { type TablerName } from '@/components/TablerIcon';

/** Ikon keunggulan toko (Tabler Icons). */
const MAP: Record<FeatureIconName, TablerName> = {
  doc: 'file-text',
  list: 'list',
  bolt: 'bolt',
  shield: 'shield-check',
  tag: 'tag',
  lock: 'lock',
  chat: 'message-circle',
  box: 'package',
};

export default function FeatureIcon({ name, size = 26 }: { name: FeatureIconName; size?: number }) {
  return <TablerIcon name={MAP[name]} size={size} stroke={1.8} />;
}
