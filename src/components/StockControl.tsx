import { Pressable, Text, View } from 'react-native';
import { amount } from '../lib/pantry';
import type { StockStatus, TrackingMode } from '../lib/types';
import { Chip } from './Chip';
import { colors } from './ui';

const STATUSES: StockStatus[] = ['Have', 'Low', 'Out'];

/** +/- for counted locations, Have / Low / Out for status locations (the fridge). */
export function StockControl({
  mode,
  quantity,
  status,
  unit,
  onAdjust,
  onStatus,
}: {
  mode: TrackingMode;
  quantity: number;
  status: StockStatus | null;
  unit?: string | null;
  onAdjust: (delta: number) => void;
  onStatus: (status: StockStatus) => void;
}) {
  if (mode === 'Status') {
    return (
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {STATUSES.map((s) => (
          <Chip key={s} label={s} selected={status === s} onPress={() => onStatus(s)} />
        ))}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <RoundButton label="−" accessibilityLabel="One less" onPress={() => onAdjust(-1)} disabled={quantity <= 0} />
      <Text style={{ minWidth: 48, textAlign: 'center', fontSize: 17, fontWeight: '600', color: colors.text }}>{amount(quantity, unit)}</Text>
      <RoundButton label="+" accessibilityLabel="One more" onPress={() => onAdjust(1)} />
    </View>
  );
}

function RoundButton({ label, accessibilityLabel, onPress, disabled }: { label: string; accessibilityLabel: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.surface : '#fff',
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Text style={{ fontSize: 22, color: colors.primary, lineHeight: 24 }}>{label}</Text>
    </Pressable>
  );
}
