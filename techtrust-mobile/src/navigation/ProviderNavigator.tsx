import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useI18n } from "../i18n";
import { useNotifications } from "../contexts/NotificationsContext";
import { CommonActions } from "@react-navigation/native";
import { colors } from "../constants/theme";

// Provider Screens
import ProviderDashboardScreen from "../screens/provider/ProviderDashboardScreen";
import ProviderRequestsScreen from "../screens/provider/ProviderRequestsScreen";
import ProviderRequestDetailsScreen from "../screens/provider/ProviderRequestDetailsScreen";
import ProviderQuotesScreen from "../screens/provider/ProviderQuotesScreen";
import ProviderQuoteDetailsScreen from "../screens/provider/ProviderQuoteDetailsScreen";
import ProviderWorkOrdersScreen from "../screens/provider/ProviderWorkOrdersScreen";
import ProviderWorkOrderDetailsScreen from "../screens/provider/ProviderWorkOrderDetailsScreen";
import ProviderProfileScreen from "../screens/provider/ProviderProfileScreen";

// Provider Profile Screens
import ProviderEditProfileScreen from "../screens/provider/ProviderEditProfileScreen";
import ProviderServicesScreen from "../screens/provider/ProviderServicesScreen";
import ProviderWorkingHoursScreen from "../screens/provider/ProviderWorkingHoursScreen";
import ProviderServiceAreaScreen from "../screens/provider/ProviderServiceAreaScreen";
import ProviderReportsScreen from "../screens/provider/ProviderReportsScreen";
import ProviderBankDetailsScreen from "../screens/provider/ProviderBankDetailsScreen";
import ProviderPaymentHistoryScreen from "../screens/provider/ProviderPaymentHistoryScreen";
import ProviderSecurityScreen from "../screens/provider/ProviderSecurityScreen";
import ProviderHelpScreen from "../screens/provider/ProviderHelpScreen";
import ProviderTermsAndPoliciesScreen from "../screens/provider/ProviderTermsAndPoliciesScreen";

// Provider Compliance Screens
import ProviderComplianceScreen from "../screens/provider/ProviderComplianceScreen";
import ComplianceItemDetailScreen from "../screens/provider/ComplianceItemDetailScreen";
import TechnicianManagementScreen from "../screens/provider/TechnicianManagementScreen";
import InsuranceManagementScreen from "../screens/provider/InsuranceManagementScreen";

// Common Screens
import NotificationsScreen from "../screens/NotificationsScreen";
import SupportChatScreen from "../screens/SupportChatScreen";
import ChatScreen from "../screens/ChatScreen";
import ChatListScreen from "../screens/ChatListScreen";
import ProviderReviewsScreen from "../screens/provider/ProviderReviewsScreen";

// FDACS Screens (shared with customer)
import AppointmentsScreen from "../screens/customer/AppointmentsScreen";
import AppointmentDetailsScreen from "../screens/customer/AppointmentDetailsScreen";
import ScheduleAppointmentScreen from "../screens/customer/ScheduleAppointmentScreen";
import RepairInvoicesScreen from "../screens/customer/RepairInvoicesScreen";
import RepairInvoiceDetailsScreen from "../screens/customer/RepairInvoiceDetailsScreen";
import EstimateSharesScreen from "../screens/customer/EstimateSharesScreen";
import CompareEstimatesScreen from "../screens/customer/CompareEstimatesScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack for Dashboard (Home)
function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ProviderDashboardMain"
        component={ProviderDashboardScreen}
      />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ProviderReviews" component={ProviderReviewsScreen} />
      <Stack.Screen name="Appointments" component={AppointmentsScreen} />
      <Stack.Screen
        name="AppointmentDetails"
        component={AppointmentDetailsScreen}
      />
      <Stack.Screen
        name="ScheduleAppointment"
        component={ScheduleAppointmentScreen}
      />
    </Stack.Navigator>
  );
}

// Stack for Requests (Pedidos)
function RequestsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ProviderRequestsList"
        component={ProviderRequestsScreen}
      />
      <Stack.Screen
        name="ProviderRequestDetails"
        component={ProviderRequestDetailsScreen}
      />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

// D42 — Combined Requests & Quotes Stack (merged from 2 separate tabs)
function RequestsAndQuotesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="RequestsAndQuotesMain"
        component={RequestsAndQuotesScreen}
      />
      <Stack.Screen
        name="ProviderRequestsList"
        component={ProviderRequestsScreen}
      />
      <Stack.Screen
        name="ProviderRequestDetails"
        component={ProviderRequestDetailsScreen}
      />
      <Stack.Screen
        name="ProviderQuotesList"
        component={ProviderQuotesScreen}
      />
      <Stack.Screen
        name="ProviderQuoteDetails"
        component={ProviderQuoteDetailsScreen}
      />
      <Stack.Screen
        name="QuoteWorkOrderDetails"
        component={ProviderWorkOrderDetailsScreen}
      />
      <Stack.Screen name="EstimateShares" component={EstimateSharesScreen} />
      <Stack.Screen
        name="CompareEstimates"
        component={CompareEstimatesScreen}
      />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

// D42 — Combined Requests & Quotes Screen with segment control
function RequestsAndQuotesScreen({ navigation }: any) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'requests' | 'quotes'>('requests');

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Segment Control Header */}
      <View style={{
        backgroundColor: '#fff',
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
      }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 12 }}>
          {t.provider?.requestsAndQuotes || 'Requests & Quotes'}
        </Text>
        <View style={{
          flexDirection: 'row',
          backgroundColor: '#f3f4f6',
          borderRadius: 10,
          padding: 3,
        }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: activeTab === 'requests' ? '#fff' : 'transparent',
              shadowColor: activeTab === 'requests' ? '#000' : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: activeTab === 'requests' ? 0.1 : 0,
              shadowRadius: 3,
              elevation: activeTab === 'requests' ? 2 : 0,
            }}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: activeTab === 'requests' ? '700' : '500',
              color: activeTab === 'requests' ? colors.primary : colors.gray500,
            }}>
              {t.nav?.requests || 'Requests'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: activeTab === 'quotes' ? '#fff' : 'transparent',
              shadowColor: activeTab === 'quotes' ? '#000' : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: activeTab === 'quotes' ? 0.1 : 0,
              shadowRadius: 3,
              elevation: activeTab === 'quotes' ? 2 : 0,
            }}
            onPress={() => setActiveTab('quotes')}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: activeTab === 'quotes' ? '700' : '500',
              color: activeTab === 'quotes' ? colors.primary : colors.gray500,
            }}>
              {t.nav?.quotes || 'Quotes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {activeTab === 'requests' ? (
        <ProviderRequestsScreen navigation={navigation} />
      ) : (
        <ProviderQuotesScreen navigation={navigation} />
      )}
    </View>
  );
}

// Stack for Quotes (Orçamentos) — kept for backwards compatibility
function QuotesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ProviderQuotesList"
        component={ProviderQuotesScreen}
      />
      <Stack.Screen
        name="ProviderQuoteDetails"
        component={ProviderQuoteDetailsScreen}
      />
      <Stack.Screen
        name="QuoteWorkOrderDetails"
        component={ProviderWorkOrderDetailsScreen}
      />
      <Stack.Screen name="EstimateShares" component={EstimateSharesScreen} />
      <Stack.Screen
        name="CompareEstimates"
        component={CompareEstimatesScreen}
      />
    </Stack.Navigator>
  );
}

// Stack for Work Orders (Serviços)
function WorkOrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ProviderWorkOrdersList"
        component={ProviderWorkOrdersScreen}
      />
      <Stack.Screen
        name="ProviderWorkOrderDetails"
        component={ProviderWorkOrderDetailsScreen}
      />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="RepairInvoices" component={RepairInvoicesScreen} />
      <Stack.Screen
        name="RepairInvoiceDetails"
        component={RepairInvoiceDetailsScreen}
      />
    </Stack.Navigator>
  );
}

// Stack for Messages (Chat)
function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatListMain" component={ChatListScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

// Stack for Profile
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ProviderProfileMain"
        component={ProviderProfileScreen}
      />
      <Stack.Screen name="EditProfile" component={ProviderEditProfileScreen} />
      <Stack.Screen name="Services" component={ProviderServicesScreen} />
      <Stack.Screen
        name="WorkingHours"
        component={ProviderWorkingHoursScreen}
      />
      <Stack.Screen name="ServiceArea" component={ProviderServiceAreaScreen} />
      <Stack.Screen name="Reports" component={ProviderReportsScreen} />
      <Stack.Screen name="BankDetails" component={ProviderBankDetailsScreen} />
      <Stack.Screen
        name="PaymentHistory"
        component={ProviderPaymentHistoryScreen}
      />
      <Stack.Screen name="Security" component={ProviderSecurityScreen} />
      <Stack.Screen name="Help" component={ProviderHelpScreen} />
      <Stack.Screen
        name="TermsAndPolicies"
        component={ProviderTermsAndPoliciesScreen}
      />
      <Stack.Screen name="Compliance" component={ProviderComplianceScreen} />
      <Stack.Screen
        name="ComplianceItemDetail"
        component={ComplianceItemDetailScreen}
      />
      <Stack.Screen
        name="TechnicianManagement"
        component={TechnicianManagementScreen}
      />
      <Stack.Screen
        name="InsuranceManagement"
        component={InsuranceManagementScreen}
      />
      <Stack.Screen name="SupportChat" component={SupportChatScreen} />
    </Stack.Navigator>
  );
}

// Custom Tab Bar Icon with Badge
function TabBarIcon({
  name,
  color,
  size,
  badge,
}: {
  name: any;
  color: string;
  size: number;
  badge?: number;
}) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={name} size={size} color={color} />
      {badge && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function ProviderNavigator() {
  const { t } = useI18n();
  const { pendingRequestsCount } = useNotifications();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: {
          height: 85,
          paddingTop: 8,
          paddingBottom: 25,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.gray100,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="ProviderDashboard"
        component={DashboardStack}
        options={{
          tabBarLabel: t.nav?.home || "Home",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="home" color={color} size={size} />
          ),
        }}
      />

      {/* D42 — Merged Requests & Quotes tab (6→5 tabs) */}
      <Tab.Screen
        name="ProviderRequests"
        component={RequestsAndQuotesStack}
        options={{
          tabBarLabel: t.nav?.requests || "Requests",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon
              name="document-text"
              color={color}
              size={size}
              badge={pendingRequestsCount}
            />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Reset stack to initial route on tab press
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: "ProviderRequests",
                    state: { routes: [{ name: "RequestsAndQuotesMain" }] },
                  },
                ],
              }),
            );
          },
        })}
      />

      <Tab.Screen
        name="ProviderWorkOrders"
        component={WorkOrdersStack}
        options={{
          tabBarLabel: t.nav?.services || "Services",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="construct" color={color} size={size} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: "ProviderWorkOrders",
                    state: { routes: [{ name: "ProviderWorkOrdersList" }] },
                  },
                ],
              }),
            );
          },
        })}
      />

      <Tab.Screen
        name="ProviderMessages"
        component={MessagesStack}
        options={{
          tabBarLabel: t.nav?.messages || "Messages",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="chatbubbles" color={color} size={size} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: "ProviderMessages",
                    state: { routes: [{ name: "ChatListMain" }] },
                  },
                ],
              }),
            );
          },
        })}
      />

      <Tab.Screen
        name="ProviderProfile"
        component={ProfileStack}
        options={{
          tabBarLabel: t.nav?.profile || "Profile",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="person" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
