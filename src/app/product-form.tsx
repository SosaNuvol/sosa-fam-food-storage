import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { Chip } from '../components/Chip';
import { Button, colors, ErrorText, Field, Muted } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { lookupBarcode, parseNumber } from '../lib/pantry';
import type { Product, ProductInput, Store } from '../lib/types';

/**
 * Add an item (optionally from a scanned barcode, looked up in Open Food Facts) or edit one.
 * Minimum and target drive the "Need to buy" list.
 */
export default function ProductForm() {
  const params = useLocalSearchParams<{ productId?: string; barcode?: string }>();
  const { current } = useAuth();
  const householdId = current?.householdId;
  const editing = !!params.productId;

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState(params.barcode ?? '');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [min, setMin] = useState('');
  const [target, setTarget] = useState('');
  const [isStaple, setIsStaple] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [looking, setLooking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) return;
    api<Store[]>(`/households/${householdId}/stores`).then(setStores).catch(() => {});
    if (params.productId) {
      api<Product>(`/households/${householdId}/pantry/products/${encodeURIComponent(params.productId)}`)
        .then((p) => {
          setName(p.name);
          setBarcode(p.barcode ?? '');
          setCategory(p.category ?? '');
          setUnit(p.unit ?? '');
          setMin(p.minQuantity != null ? String(p.minQuantity) : '');
          setTarget(p.targetQuantity != null ? String(p.targetQuantity) : '');
          setIsStaple(p.isStaple);
          setStoreId(p.storeId);
          setImageUrl(p.imageUrl);
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Could not load this item.'));
    } else if (params.barcode) {
      setLooking(true);
      lookupBarcode(params.barcode)
        .then((info) => {
          if (!info) return;
          setName((n) => n || info.name);
          setCategory((c) => c || info.category || '');
          setImageUrl(info.imageUrl);
        })
        .finally(() => setLooking(false));
    }
  }, [householdId, params.productId, params.barcode]);

  const save = async () => {
    const minQuantity = parseNumber(min);
    const targetQuantity = parseNumber(target);
    if (!name.trim()) return setError('Give it a name.');
    if (minQuantity === undefined || targetQuantity === undefined) return setError('Minimum and target must be numbers.');
    if (minQuantity != null && targetQuantity != null && targetQuantity < minQuantity) return setError('Target should be at least the minimum.');
    const body: ProductInput = {
      name: name.trim(),
      barcode: barcode.trim() || null,
      category: category.trim() || null,
      unit: unit.trim() || null,
      minQuantity,
      targetQuantity,
      isStaple,
      storeId,
      imageUrl,
    };
    setBusy(true);
    setError(null);
    try {
      const base = `/households/${householdId}/pantry/products`;
      const saved = editing
        ? await api<Product>(`${base}/${encodeURIComponent(params.productId!)}`, { method: 'PUT', body })
        : await api<Product>(base, { method: 'POST', body });
      if (editing) router.back();
      else router.replace({ pathname: '/product/[productId]', params: { productId: saved.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ backgroundColor: '#fff' }} contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        {looking && <Muted>Looking up the barcode…</Muted>}
        <Field label="Name" value={name} onChangeText={setName} placeholder="Long grain rice" />
        <Field label="Unit" value={unit} onChangeText={setUnit} placeholder="lb, can, box, gal" autoCapitalize="none" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Minimum to keep" value={min} onChangeText={setMin} keyboardType="decimal-pad" placeholder="10" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Restock up to" value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="25" />
          </View>
        </View>
        <Muted>When the total in the pantry and basement drops below the minimum, it goes on the Need to buy list.</Muted>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Fridge staple</Text>
            <Muted>Add it to the list when the fridge says Low or Out (milk, eggs).</Muted>
          </View>
          <Switch value={isStaple} onValueChange={setIsStaple} />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Usual store</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip label="Any store" selected={!storeId} onPress={() => setStoreId(null)} />
            {stores.map((s) => (
              <Chip key={s.id} label={s.name} selected={storeId === s.id} onPress={() => setStoreId(s.id)} />
            ))}
          </ScrollView>
          {stores.length === 0 && <Muted>Stores are added in the family app.</Muted>}
        </View>

        <Field label="Category" value={category} onChangeText={setCategory} placeholder="Grains" />
        <Field label="Barcode" value={barcode} onChangeText={setBarcode} keyboardType="number-pad" />

        <ErrorText message={error} />
        <Button title={editing ? 'Save' : 'Add item'} onPress={save} busy={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
