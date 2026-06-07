import { TableScreen } from '../../src/table/TableScreen';
import { useLocalSearchParams } from 'expo-router';

export default function TableRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  if (!sessionId) return null;
  return <TableScreen sessionId={sessionId} />;
}
