import { StandardTableLayout } from './StandardTableLayout';
import type { TableLayoutProps } from './table-layout-types';

type Props = TableLayoutProps & {
  overlay?: React.ReactNode;
  onChatOpen?: () => void;
  chatUnread?: number;
};

export function DesktopTableLayout(props: Props) {
  return <StandardTableLayout variant="desktop" {...props} />;
}
