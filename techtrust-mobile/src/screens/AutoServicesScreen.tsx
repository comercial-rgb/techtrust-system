import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../i18n";
import CarWashMapScreen from "./CarWashMapScreen";
import PartsStoreScreen from "./PartsStoreScreen";

const { width } = Dimensions.get("window");

export default function AutoServicesScreen() {
  const [activeTab, setActiveTab] = useState<"carWash" | "autoParts">("carWash");
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      {/* Segment Control */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === "carWash" && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveTab("carWash")}
        >
          <MaterialCommunityIcons
            name="car-wash"
            size={18}
            color={activeTab === "carWash" ? "#fff" : "#6B7280"}
          />
          <Text
            style={[
              styles.segmentText,
              activeTab === "carWash" && styles.segmentTextActive,
            ]}
          >
            Car Wash
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === "autoParts" && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveTab("autoParts")}
        >
          <MaterialCommunityIcons
            name="car-cog"
            size={18}
            color={activeTab === "autoParts" ? "#fff" : "#6B7280"}
          />
          <Text
            style={[
              styles.segmentText,
              activeTab === "autoParts" && styles.segmentTextActive,
            ]}
          >
            Auto Parts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "carWash" ? (
          <CarWashMapScreen />
        ) : (
          <PartsStoreScreen />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  segmentContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#fff",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    gap: 6,
  },
  segmentButtonActive: {
    backgroundColor: "#2563EB",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  segmentTextActive: {
    color: "#fff",
  },
  content: {
    flex: 1,
  },
});
