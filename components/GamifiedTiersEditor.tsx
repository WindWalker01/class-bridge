import { useState } from "react";
import { Pressable, View } from "react-native";

import { Button, Card, TextField, ThemedText } from "@/components";
import { radii, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import type { SpeedBonusTier } from "@/types";
import { DEFAULT_SPEED_BONUS_TIERS } from "@/types";
import { X } from "lucide-react-native";

// ---------------------------------------------------------------------------
// GamifiedTiersEditor
// ---------------------------------------------------------------------------

export interface GamifiedTiersEditorProps {
  initialTiers?: SpeedBonusTier[];
  onSave: (tiers: SpeedBonusTier[]) => Promise<void>;
}

export default function GamifiedTiersEditor({
  initialTiers,
  onSave,
}: GamifiedTiersEditorProps) {
  const { colors } = useTheme();

  const [tiers, setTiers] = useState<SpeedBonusTier[]>(
    initialTiers ?? DEFAULT_SPEED_BONUS_TIERS,
  );
  const [saving, setSaving] = useState(false);

  const updateTier = (index: number, field: keyof SpeedBonusTier, value: string) => {
    setTiers((prev) => {
      const updated = [...prev];
      const num = parseFloat(value);
      if (!isNaN(num)) {
        updated[index] = {
          ...updated[index],
          [field]: field === "maxTimeSeconds" ? Math.round(num) : num,
        };
      }
      return updated;
    });
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        maxTimeSeconds: (prev[prev.length - 1]?.maxTimeSeconds ?? 30) + 15,
        multiplier: 1.0,
      },
    ]);
  };

  const removeTier = (index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(tiers);
    setSaving(false);
  };

  return (
    <View style={{ marginTop: spacing.md }}>
      <ThemedText
        variant="caption"
        style={{ fontWeight: "600", marginBottom: spacing.xs }}
      >
        Speed Bonus Tiers
      </ThemedText>
      <ThemedText variant="small" muted style={{ marginBottom: spacing.md }}>
        When a student answers within the time threshold, their points are
        multiplied. Tiers are checked from top to bottom — the first match wins.
      </ThemedText>

      {tiers.map((tier, index) => (
        <Card
          key={index}
          variant="flat"
          style={{ marginBottom: spacing.sm }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
            }}
          >
            <ThemedText
              variant="small"
              style={{ fontWeight: "600", minWidth: 60 }}
            >
              Tier {index + 1}
            </ThemedText>

            <View
              style={{
                flex: 1,
                flexDirection: "row",
                gap: spacing.xs,
                alignItems: "center",
              }}
            >
              <ThemedText variant="small" muted>
                Time &lt;
              </ThemedText>
              <TextField
                placeholder="sec"
                value={String(tier.maxTimeSeconds)}
                onChangeText={(v) => updateTier(index, "maxTimeSeconds", v)}
                keyboardType="numeric"
                style={{ flex: 1, minWidth: 50 }}
              />
              <ThemedText variant="small" muted>
                sec → ×
              </ThemedText>
              <TextField
                placeholder="1.0"
                value={String(tier.multiplier)}
                onChangeText={(v) => updateTier(index, "multiplier", v)}
                keyboardType="decimal-pad"
                style={{ flex: 1, minWidth: 50 }}
              />
            </View>

            {tiers.length > 1 && (
              <Pressable
                onPress={() => removeTier(index)}
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: pressed ? "#fecaca" : colors.surfaceMuted,
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <X size={16} color={colors.danger} />
              </Pressable>
            )}
          </View>
        </Card>
      ))}

      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.xs }}>
        <Button
          label="+ Add Tier"
          variant="ghost"
          onPress={addTier}
          style={{ flex: 1 }}
        />
        <Button
          label="Save Tiers"
          loading={saving}
          onPress={handleSave}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}