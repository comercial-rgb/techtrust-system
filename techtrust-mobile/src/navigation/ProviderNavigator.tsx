import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useI18n } from "../i18n";
import { useNotifications } from "../contexts/NotificationsContext";
import { CommonActions } from "@react-navigation/native";
import { colors } from "../constants/theme";
import type {
  EmbeddedRequestsQuotesNavigationCast,
  ProviderDashboardStackParamList,
  ProviderMessagesStackParamList,
  ProviderProfileStackParamList,
  ProviderRequestsAndQuotesStackParamList,
  ProviderTabParamList,
  ProviderWorkOrdersStackParamList,
  RequestsAndQuotesMainScreenProps,
} from "./types";

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
import ProviderBusinessScreen from "../screens/provider/ProviderBusinessScreen";
import ProviderSOSInboxScreen from "../screens/provider/ProviderSOSInboxScreen";
import ProviderSOSRateCardScreen from "../screens/provider/ProviderSOSRateCardScreen";

// FDACS Screens (shared with customer)
import AppointmentsScreen from "../screens/customer/AppointmentsScreen";
import AppointmentDetailsScreen from "../screens/customer/AppointmentDetailsScreen";
import ScheduleAppointmentScreen from "../screens/customer/ScheduleAppointmentScreen";
import RepairInvoicesScreen from "../screens/customer/RepairInvoicesScreen";
import RepairInvoiceDetailsScreen from "../screens/customer/RepairInvoiceDetailsScreen";
import EstimateSharesScreen from "../screens/customer/EstimateSharesScreen";
import CompareEstimatesScreen from "../screens/customer/CompareEstimatesScreen";

const Tab = createBottomTabNavigator<ProviderTabParamList>();
const DashboardStackNav =
  createNativeStackNavigator<ProviderDashboardStackParamList>();
const RequestsAndQuotesStackNav =
  createNativeStackNavigator<ProviderRequestsAndQuotesStackParamList>();
const WorkOrdersStackNav =
  createNativeStackNavigator<ProviderWorkOrdersStackParamList>();
const MessagesStackNav =
  createNativeStackNavigator<ProviderMessagesStackParamList>();
const ProfileStackNav =
  createNativeStackNavigator<ProviderProfileStackParamList>();

// Stack for Dashboard (Home)
function DashboardStack() {
  return (
    <DashboardStackNav.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStackNav.Screen
        name="ProviderDashboardMain"
        component={ProviderDashboardScreen}
      />
      <DashboardStackNav.Screen name="Notifications" component={NotificationsScreen} />
      <DashboardStackNav.Screen name="ChatList" component={ChatListScreen} />
      <DashboardStackNav.Screen name="Chat" component={ChatScreen} />
      <DashboardStackNav.Screen name="ProviderReviews" component={ProviderReviewsScreen} />
      <DashboardStackNav.Screen name="ProviderBusiness" component={ProviderBusinessScreen} />
      <DashboardStackNav.Screen name="SOSInbox" component={ProviderSOSInboxScreen} />
      <DashboardStackNav.Screen name="SOSRateCard" component={ProviderSOSRateCardScreen} />
      <DashboardStackNav.Screen name="Appointments" component={AppointmentsScreen} />
      <DashboardStackNav.Screen
        name="AppointmentDetails"
        component={AppointmentDetailsScreen}
      />
      <DashboardStackNav.Screen
        name="ScheduleAppointment"
        component={ScheduleAppointmentScreen}
      />
      {/* Get Started checklist targets — stay within Dashboard tab so goBack returns to Dashboard */}
      <DashboardStackNav.Screen name="EditProfile" component={ProviderEditProfileScreen} />
      <DashboardStackNav.Screen name="Services" component={ProviderServicesScreen} />
      <DashboardStackNav.Screen name="WorkingHours" component={ProviderWorkingHoursScreen} />
      <DashboardStackNav.Screen name="ServiceArea" component={ProviderServiceAreaScreen} />
    </DashboardStackNav.Navigator>
  );
}

// D42 — Combined Requests & Quotes Stack (merged from 2 separate tabs)
function RequestsAndQuotesStack() {
  return (
    <RequestsAndQuotesStackNav.Navigator screenOptions={{ headerShown: false }}>
      <RequestsAndQuotesStackNav.Screen
        name="RequestsAndQuotesMain"
        component={RequestsAndQuotesScreen}
      />
      <RequestsAndQuotesStackNav.Screen
        name="ProviderRequestsList"
        component={ProviderRequestsScreen}
      />
      <RequestsAndQuotesStackNav.Screen
        name="ProviderRequestDetails"
        component={ProviderRequestDetailsScreen}
      />
      <RequestsAndQuotesStackNav.Screen
        name="ProviderQuotesList"
        component={ProviderQuotesScreen}
      />
      <RequestsAndQuotesStackNav.Screen
        name="ProviderQuoteDetails"
        component={ProviderQuoteDetailsScreen}
      />
      <RequestsAndQuotesStackNav.Screen
        name="QuoteWorkOrderDetails"
        component={ProviderWorkOrderDetailsScreen}
      />
      <RequestsAndQuotesStackNav.Screen name="EstimateShares" component={EstimateSharesScreen} />
      <RequestsAndQuotesStackNav.Screen
        name="CompareEstimates"
        component={CompareEstimatesScreen}
      />
      <RequestsAndQuotesStackNav.Screen name="Chat" component={ChatScreen} />
    </RequestsAndQuotesStackNav.Navigator>
  );
}

// D42 — Combined Requests & Quotes Screen with segment control
function RequestsAndQuotesScreen({
  navigation,
}: RequestsAndQuotesMainScreenProps) {
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
      {activeTab === "requests" ? (
        <ProviderRequestsScreen
          navigation={
            navigation as unknown as EmbeddedRequestsQuotesNavigationCast<"ProviderRequestsList">
          }
        />
      ) : (
        <ProviderQuotesScreen
          navigation={
            navigation as unknown as EmbeddedRequestsQuotesNavigationCast<"ProviderQuotesList">
          }
        />
      )}
    </View>
  );
}

// Stack for Work Orders (Serviços)
function WorkOrdersStack() {
  return (
    <WorkOrdersStackNav.Navigator screenOptions={{ headerShown: false }}>
      <WorkOrdersStackNav.Screen
        name="ProviderWorkOrdersList"
        component={ProviderWorkOrdersScreen}
      />
      <WorkOrdersStackNav.Screen
        name="ProviderWorkOrderDetails"
        component={ProviderWorkOrderDetailsScreen}
      />
      <WorkOrdersStackNav.Screen name="Chat" component={ChatScreen} />
      <WorkOrdersStackNav.Screen name="RepairInvoices" component={RepairInvoicesScreen} />
      <WorkOrdersStackNav.Screen
        name="RepairInvoiceDetails"
        component={RepairInvoiceDetailsScreen}
      />
    </WorkOrdersStackNav.Navigator>
  );
}

// Stack for Messages (Chat)
function MessagesStack() {
  return (
    <MessagesStackNav.Navigator screenOptions={{ headerShown: false }}>
      <MessagesStackNav.Screen name="ChatListMain" component={ChatListScreen} />
      <MessagesStackNav.Screen name="Chat" component={ChatScreen} />
    </MessagesStackNav.Navigator>
  );
}

// Stack for Profile
function ProfileStack() {
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen
        name="ProviderProfileMain"
        component={ProviderProfileScreen}
      />
      <ProfileStackNav.Screen name="EditProfile" component={ProviderEditProfileScreen} />
      <ProfileStackNav.Screen name="ProviderBusiness" component={ProviderBusinessScreen} />
      <ProfileStackNav.Screen name="Services" component={ProviderServicesScreen} />
      <ProfileStackNav.Screen
        name="WorkingHours"
        component={ProviderWorkingHoursScreen}
      />
      <ProfileStackNav.Screen name="ServiceArea" component={ProviderServiceAreaScreen} />
      <ProfileStackNav.Screen name="Reports" component={ProviderReportsScreen} />
      <ProfileStackNav.Screen name="BankDetails" component={ProviderBankDetailsScreen} />
      <ProfileStackNav.Screen
        name="PaymentHistory"
        component={ProviderPaymentHistoryScreen}
      />
      <ProfileStackNav.Screen name="Security" component={ProviderSecurityScreen} />
      <ProfileStackNav.Screen name="Help" component={ProviderHelpScreen} />
      <ProfileStackNav.Screen
        name="TermsAndPolicies"
        component={ProviderTermsAndPoliciesScreen}
      />
      <ProfileStackNav.Screen name="Compliance" component={ProviderComplianceScreen} />
      <ProfileStackNav.Screen
        name="ComplianceItemDetail"
        component={ComplianceItemDetailScreen}
      />
      <ProfileStackNav.Screen
        name="TechnicianManagement"
        component={TechnicianManagementScreen}
      />
      <ProfileStackNav.Screen
        name="InsuranceManagement"
        component={InsuranceManagementScreen}
      />
      <ProfileStackNav.Screen name="SupportChat" component={SupportChatScreen} />
    </ProfileStackNav.Navigator>
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
