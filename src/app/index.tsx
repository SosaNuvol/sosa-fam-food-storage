import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';

/** Sends people to the right place: sign in, create or join a family, or home. */
export default function Index() {
  const { status, me } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (status === 'signedOut') return <Redirect href="/sign-in" />;
  if (!me?.households.length) return <Redirect href="/welcome" />;
  return <Redirect href="/home" />;
}
