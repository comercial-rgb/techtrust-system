import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useI18n } from "../../i18n";

export type PartCondition = "NEW" | "USED" | "REBUILT" | "RECONDITIONED";

export type QuoteLineItem = {
  id: string;
  type: "PART" | "LABOR";
  description: string;
  brand?: string; // Brand/Manufacturer
  partCode?: string; // Part code/reference number
  partCondition?: PartCondition; // FDACS Req #5: identify parts as new/used/rebuilt/reconditioned
  quantity: string; // store as string for controlled input
  unitPrice: string; // store as string for controlled input
  isNoCharge?: boolean; // FDACS Req #4: items provided at no cost
};

interface Props {
  items: QuoteLineItem[];
  onChange: (items: QuoteLineItem[]) => void;
}

export default function QuoteLineItemsEditor({ items, onChange }: Props) {
  const { t } = useI18n();
  const addItem = () => {
    const newItem: QuoteLineItem = {
      id: Math.random().toString(36).slice(2),
      type: "PART",
      description: "",
      brand: "",
      partCode: "",
      partCondition: "NEW",
      quantity: "1",
      unitPrice: "0.00",
      isNoCharge: false,
    };
    onChange([...items, newItem]);
  };

  const updateItem = (id: string, patch: Partial<QuoteLineItem>) => {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    onChange(items.filter((it) => it.id !== id));
  };

  const parseNumber = (value: string) => {
    const n = parseFloat(value.replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const totalForItem = (it: QuoteLineItem) => {
    return parseNumber(it.quantity) * parseNumber(it.unitPrice);
  };

  const partsTotal = items
    .filter((i) => i.type === "PART")
    .reduce((acc, i) => acc + totalForItem(i), 0);
  const laborTotal = items
    .filter((i) => i.type === "LABOR")
    .reduce((acc, i) => acc + totalForItem(i), 0);
  const grandTotal = partsTotal + laborTotal;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>
          {t.quote?.items || "Quote Items"} *
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={addItem}>
          <MaterialCommunityIcons name="plus" size={18} color="#fff" />
          <Text style={styles.addButtonText}>{t.common?.add || "Add"}</Text>
        </TouchableOpacity>
      </View>
      {items.length === 0 && (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={32}
            color="#9ca3af"
          />
          <Text style={styles.emptyText}>
            {t.quote?.noItems || "No items added"}
          </Text>
        </View>
      )}
      <ScrollView
        style={{ maxHeight: 260 }}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, index) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.typeSwitch}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    item.type === "PART" && styles.typeOptionActive,
                  ]}
                  onPress={() => updateItem(item.id, { type: "PART" })}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      item.type === "PART" && styles.typeOptionTextActive,
                    ]}
                  >
                    {t.quote?.part || "Part"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    item.type === "LABOR" && styles.typeOptionActive,
                  ]}
                  onPress={() => updateItem(item.id, { type: "LABOR" })}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      item.type === "LABOR" && styles.typeOptionTextActive,
                    ]}
                  >
                    {t.quote?.service || "Service"}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => removeItem(item.id)}
                style={styles.removeButton}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={20}
                  color="#ef4444"
                />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder={
                item.type === "PART"
                  ? t.quote?.partDescription || "Part description"
                  : t.quote?.serviceDescription || "Service description"
              }
              value={item.description}
              onChangeText={(text) =>
                updateItem(item.id, { description: text })
              }
            />
            {item.type === "PART" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={t.quote?.brand || "Brand / Manufacturer *"}
                  value={item.brand || ""}
                  onChangeText={(text) => updateItem(item.id, { brand: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder={
                    t.quote?.partCode || "Part code (e.g., OEM-12345, ABC-789)"
                  }
                  value={item.partCode || ""}
                  onChangeText={(text) =>
                    updateItem(item.id, { partCode: text })
                  }
                />
                {/* FDACS Req #5: Part Condition */}
                <Text style={styles.smallLabel}>
                  {t.quote?.partCondition || "Part Condition"} *
                </Text>
                <View style={styles.conditionRow}>
                  {(
                    [
                      "NEW",
                      "USED",
                      "REBUILT",
                      "RECONDITIONED",
                    ] as PartCondition[]
                  ).map((cond) => (
                    <TouchableOpacity
                      key={cond}
                      style={[
                        styles.conditionOption,
                        item.partCondition === cond &&
                          styles.conditionOptionActive,
                      ]}
                      onPress={() =>
                        updateItem(item.id, { partCondition: cond })
                      }
                    >
                      <Text
                        style={[
                          styles.conditionText,
                          item.partCondition === cond &&
                            styles.conditionTextActive,
                        ]}
                      >
                        {cond === "NEW"
                          ? t.quote?.condNew || "New"
                          : cond === "USED"
                            ? t.quote?.condUsed || "Used"
                            : cond === "REBUILT"
                              ? t.quote?.condRebuilt || "Rebuilt"
                              : t.quote?.condRecond || "Recond."}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            {/* FDACS Req #4: No Charge toggle */}
            <TouchableOpacity
              style={styles.noChargeRow}
              onPress={() =>
                updateItem(item.id, {
                  isNoCharge: !item.isNoCharge,
                  unitPrice: !item.isNoCharge ? "0.00" : item.unitPrice,
                })
              }
            >
              <MaterialCommunityIcons
                name={
                  item.isNoCharge ? "checkbox-marked" : "checkbox-blank-outline"
                }
                size={20}
                color={item.isNoCharge ? "#16a34a" : "#9ca3af"}
              />
              <Text
                style={[
                  styles.noChargeText,
                  item.isNoCharge && { color: "#16a34a" },
                ]}
              >
                {t.quote?.noCharge || "No charge (provided at no cost)"}
              </Text>
            </TouchableOpacity>
            <View style={styles.inlineRow}>
              <View style={styles.inlineField}>
                <Text style={styles.smallLabel}>{t.quote?.qty || "Qty"}</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={item.quantity}
                  onChangeText={(text) =>
                    updateItem(item.id, { quantity: text })
                  }
                />
              </View>
              <View style={styles.inlineField}>
                <Text style={styles.smallLabel}>
                  {t.quote?.unitPrice || "Unit Price"} ($)
                </Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={item.unitPrice}
                  onChangeText={(text) =>
                    updateItem(item.id, { unitPrice: text })
                  }
                />
              </View>
              <View style={[styles.inlineField, { flex: 0.8 }]}>
                <Text style={styles.smallLabel}>
                  {t.common?.total || "Total"}
                </Text>
                <View style={styles.totalBadge}>
                  <Text style={styles.totalBadgeText}>
                    ${totalForItem(item).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {t.quote?.subtotalParts || "Subtotal Parts"}
          </Text>
          <Text style={styles.summaryValue}>${partsTotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {t.quote?.subtotalServices || "Subtotal Services"}
          </Text>
          <Text style={styles.summaryValue}>${laborTotal.toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTotalLabel}>
            {t.common?.total || "Total"}
          </Text>
          <Text style={styles.summaryTotalValue}>${grandTotal.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#1976d2",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    gap: 6,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyBox: {
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#6b7280",
  },
  itemCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  typeSwitch: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 30,
    padding: 4,
  },
  typeOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeOptionActive: {
    backgroundColor: "#1976d2",
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  typeOptionTextActive: {
    color: "#fff",
  },
  removeButton: {
    padding: 4,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f2937",
    marginBottom: 10,
  },
  conditionRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  conditionOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  conditionOptionActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#3b82f6",
  },
  conditionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
  },
  conditionTextActive: {
    color: "#1d4ed8",
  },
  noChargeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  noChargeText: {
    fontSize: 12,
    color: "#6b7280",
  },
  inlineRow: {
    flexDirection: "row",
    gap: 8,
  },
  inlineField: {
    flex: 1,
  },
  smallLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
    marginLeft: 4,
  },
  totalBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  totalBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e40af",
  },
  summaryBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 6,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#374151",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 6,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e40af",
  },
});
