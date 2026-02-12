/**
 * ProviderComplianceBadge - Customer-facing badge showing provider verification status
 * Shows on provider cards, provider detail screens
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getProviderComplianceBadge } from "../../services/compliance.service";

interface Props {
  status: string;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  onPress?: () => void;
}

export default function ProviderComplianceBadge({
  status,
  size = "small",
  showLabel = true,
  onPress,
}: Props) {
  const badge = getProviderComplianceBadge(status);

  const iconSize = size === "large" ? 22 : size === "medium" ? 18 : 14;
  const fontSize = size === "large" ? 14 : size === "medium" ? 12 : 10;

  const content = (
    <View
      style={[
        styles.container,
        { backgroundColor: badge.bgColor },
        size === "large" && styles.containerLarge,
      ]}
    >
      <Ionicons name={badge.icon as any} size={iconSize} color={badge.color} />
      {showLabel && (
        <Text style={[styles.label, { color: badge.color, fontSize }]}>
          {badge.label}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  containerLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  label: {
    fontWeight: "700",
  },
});
