/**
 * NotificationsScreen - Tela de Notificações
 * Usado tanto por Cliente quanto Fornecedor
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";
import { useI18n } from "../i18n";

interface Notification {
  id: string;
  type: "request" | "quote" | "payment" | "message" | "review" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
  data?: any;
}

interface NotificationsScreenProps {
  navigation: any;
  userType?: "customer" | "provider";
}

export default function NotificationsScreen({
  navigation,
  userType = "customer",
}: NotificationsScreenProps) {
  const { t } = useI18n();
  const [refreshing, setRefreshing] = useState(false);
  // Load real notifications from API
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = async () => {
    try {
      const api = (await import("../services/api")).default;
      const response = await api.get("/notifications");
      const data = response.data.data || response.data || [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      // Keep existing notifications on error
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const getNotificationIcon = (type: Notification["type"]) => {
    const icons: Record<string, { name: string; color: string; bg: string }> = {
      request: {
        name: "document-text",
        color: colors.primary,
        bg: colors.primaryLight,
      },
      quote: { name: "pricetag", color: "#10b981", bg: "#dcfce7" },
      payment: { name: "card", color: "#f59e0b", bg: "#fef3c7" },
      message: { name: "chatbubble", color: "#8b5cf6", bg: "#ede9fe" },
      review: { name: "star", color: "#ec4899", bg: "#fce7f3" },
      system: { name: "information-circle", color: "#6b7280", bg: "#f3f4f6" },
    };
    return icons[type] || icons.system;
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    );

    // Navigate based on type
    switch (notification.type) {
      case "quote":
        // Navigate to quote details
        break;
      case "message":
        navigation.navigate("Chat");
        break;
      case "payment":
        // Navigate to payment details
        break;
      case "request":
        // Navigate to request details
        break;
      case "review":
        // Navigate to review screen
        break;
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Reload notifications from server
    await loadNotifications();
    setRefreshing(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.read && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name as any} size={22} color={icon.color} />
        </View>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, !item.read && styles.unreadTitle]}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.notifications?.notifications || "Notifications"}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn}>
            <Text style={styles.markReadText}>
              {t.notifications?.markAllRead || "Mark all read"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Badge */}
      {unreadCount > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            {unreadCount}{" "}
            {unreadCount === 1
              ? t.notifications?.newNotification || "new notification"
              : t.notifications?.newNotifications || "new notifications"}
          </Text>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={60}
              color="#d1d5db"
            />
            <Text style={styles.emptyTitle}>
              {t.notifications?.noNotifications || "No notifications"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t.notifications?.emptyMessage ||
                "You will be notified about important updates here"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  markReadBtn: {
    padding: 8,
  },
  markReadText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },
  badgeContainer: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  badgeText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  unreadCard: {
    backgroundColor: "#f0f9ff",
    borderColor: colors.primary,
    borderLeftWidth: 3,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
    flex: 1,
  },
  unreadTitle: {
    fontWeight: "600",
    color: "#111827",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 6,
  },
  time: {
    fontSize: 12,
    color: "#9ca3af",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
