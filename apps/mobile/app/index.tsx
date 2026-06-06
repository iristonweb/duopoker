import { Redirect } from 'expo-router';
import { useMobileStore } from '../src/state/useMobileStore';

export default function Index() {
  const accessToken = useMobileStore((s) => s.accessToken);
  return accessToken ? <Redirect href="/lobby" /> : <Redirect href="/login" />;
}
