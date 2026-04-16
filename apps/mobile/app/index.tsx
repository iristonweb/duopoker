import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMobileStore } from '../src/state/useMobileStore';

export default function HomeScreen() {
  const { userId, connectSocket, socket } = useMobileStore();

  useEffect(() => {
    connectSocket();
  }, [connectSocket]);

  const joinQueue = async () => {
    await Haptics.selectionAsync();
    socket?.emit('queueMatchmaking', { userId, mode: 'HOLDEM', buyIn: 100 });
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' }}>
      <Text style={{ color: '#FFD700', fontSize: 22 }}>DuoPoker Mobile</Text>
      <Text style={{ color: '#50C878', marginTop: 10 }}>Offline-safe lobby and reconnect enabled</Text>
      <Pressable onPress={joinQueue} style={{ marginTop: 20, backgroundColor: '#1A1A2E', padding: 12 }}>
        <Text style={{ color: '#FFF' }}>Queue Matchmaking</Text>
      </Pressable>
    </View>
  );
}
