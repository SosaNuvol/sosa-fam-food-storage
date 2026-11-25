import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShadowVisible: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ title: 'Sign in', headerBackVisible: false }} />
        <Stack.Screen name="welcome" options={{ title: 'Your family', headerBackVisible: false }} />
        <Stack.Screen name="home" options={{ title: 'Food storage', headerBackVisible: false }} />
        <Stack.Screen name="needs" options={{ title: 'Need to buy' }} />
        <Stack.Screen name="product/[productId]" options={{ title: 'Item' }} />
        <Stack.Screen name="product-form" options={{ title: 'Item details', presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ title: 'Scan a barcode', presentation: 'modal' }} />
        <Stack.Screen name="put-away" options={{ title: 'Put away groceries' }} />
        <Stack.Screen name="activity" options={{ title: 'History' }} />
        <Stack.Screen name="locations" options={{ title: 'Locations' }} />
      </Stack>
    </AuthProvider>
  );
}
