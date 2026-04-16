import { Text, View } from 'react-native';

export default function App() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0A0A0A',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Text style={{ color: '#FFD700', fontSize: 20 }}>DuoPoker Mobile Lobby</Text>
      <Text style={{ color: '#50C878', marginTop: 8 }}>
        Virtual chips only. Purchases are final.
      </Text>
    </View>
  );
}
