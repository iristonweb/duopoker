import type { TableLayoutKind } from '../../../hooks/useTableLayoutMode';
import { DesktopTableLayout } from './DesktopTableLayout';
import { TabletTableLayout } from './TabletTableLayout';
import { ClassicWebTableLayout } from './ClassicWebTableLayout';
import type { TableLayoutProps } from './table-layout-types';

type Props = TableLayoutProps & {
  mode: TableLayoutKind;
  overlay?: React.ReactNode;
  onChatOpen?: () => void;
  chatUnread?: number;
};

export function TableLayoutRouter({ mode, ...props }: Props) {
  switch (mode) {
    case 'mobile-classic':
      return <ClassicWebTableLayout {...props} />;
    case 'tablet':
      return <TabletTableLayout {...props} />;
    case 'desktop':
    default:
      return <DesktopTableLayout {...props} />;
  }
}
