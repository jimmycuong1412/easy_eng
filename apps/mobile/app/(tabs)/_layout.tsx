import { Tabs } from 'expo-router';
import { Text } from 'react-native';

/**
 * Main app tab bar. Icons are simple emoji for the skeleton; replace with an
 * icon set when building out Phase 5 screens.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0d1a4a', borderTopColor: 'rgba(91,141,255,0.13)' },
        tabBarActiveTintColor: '#7c5cff',
        tabBarInactiveTintColor: '#8a90b8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        options={{
          title: 'Từ vựng',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📝</Text>,
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: 'Bài học',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📖</Text>,
        }}
      />
    </Tabs>
  );
}
