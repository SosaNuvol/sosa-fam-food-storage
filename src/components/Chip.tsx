import { Pressable, Text } from 'react-native';
import { colors } from './ui';

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? '#EAF1FE' : '#fff',
      }}
    >
      <Text style={{ color: selected ? colors.primary : colors.text, fontWeight: selected ? '600' : '400' }}>{label}</Text>
    </Pressable>
  );
}
