import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ErrorText, Muted, Screen, Title } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Product } from '../lib/types';

/** Point the camera at a barcode: a known item opens; a new one opens the add form, prefilled. */
export default function Scan() {
  const { current } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const handling = useRef(false);

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (handling.current || !current) return;
    handling.current = true;
    const code = data.trim();
    try {
      const product = await api<Product>(`/households/${current.householdId}/pantry/products/by-barcode/${encodeURIComponent(code)}`);
      router.replace({ pathname: '/product/[productId]', params: { productId: product.id } });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        router.replace({ pathname: '/product-form', params: { barcode: code } });
      } else {
        setError(e instanceof Error ? e.message : 'Could not look that up.');
        handling.current = false;
      }
    }
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (!permission.granted) {
    return (
      <Screen>
        <Title>Camera</Title>
        <Muted>The camera reads barcodes on food so you don't have to type names.</Muted>
        {permission.canAskAgain ? (
          <Button title="Allow camera" onPress={requestPermission} />
        ) : (
          <Muted>Camera access is off. Turn it on for this app in Settings.</Muted>
        )}
        <Button title="Type it instead" variant="secondary" onPress={() => router.replace('/product-form')} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] }}
        onBarcodeScanned={onScanned}
      />
      <View style={{ padding: 20, gap: 10, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 16 }}>Hold the barcode inside the frame.</Text>
        <ErrorText message={error} />
        <Button title="Type it instead" variant="secondary" onPress={() => router.replace('/product-form')} />
      </View>
    </View>
  );
}
