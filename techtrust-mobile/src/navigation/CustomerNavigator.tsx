import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";
import { useI18n } from "../i18n";
import { useNotifications } from "../contexts/NotificationsContext";
import { CommonActions } from "@react-navigation/native";
import { colors } from "../constants/theme";
import type {
  CarWashStackParamList,
  CustomerTabParamList,
  HomeStackParamList,
  ProfileStackParamList,
  VehiclesStackParamList,
  WorkOrdersStackParamList,
} from "./types";

// Customer Screens
import LandingScreen from "../screens/LandingScreen";
import CustomerDashboardScreen from "../screens/CustomerDashboardScreen";
import CustomerVehiclesScreen from "../screens/CustomerVehiclesScreen";
import CustomerWorkOrdersScreen from "../screens/CustomerWorkOrdersScreen";
import CustomerProfileScreen from "../screens/CustomerProfileScreen";

// Telas auxiliares
import AddVehicleScreen from "../screens/AddVehicleScreen";
import VehicleDetailsScreen from "../screens/VehicleDetailsScreen";
import VehicleTransferScreen from "../screens/VehicleTransferScreen";
import InsuranceScreen from "../screens/InsuranceScreen";
import CreateRequestScreen from "../screens/CreateRequestScreen";
import ServiceChoiceScreen from "../screens/ServiceChoiceScreen";
import RequestDetailsScreen from "../screens/RequestDetailsScreen";
import WorkOrderDetailsScreen from "../screens/WorkOrderDetailsScreen";
import PaymentScreen from "../screens/PaymentScreen";
import RatingScreen from "../screens/RatingScreen";
import ArticleDetailScreen from "../screens/ArticleDetailScreen";

// Chat Screens
import ChatListScreen from "../screens/ChatListScreen";
import ChatScreen from "../screens/ChatScreen";

// Notifications Screen
import NotificationsScreen from "../screens/NotificationsScreen";

// Support Chat Screen
import SupportChatScreen from "../screens/SupportChatScreen";

// Customer Profile Screens
import PersonalInfoScreen from "../screens/customer/PersonalInfoScreen";
import AddressesScreen from "../screens/customer/AddressesScreen";
import PaymentMethodsScreen from "../screens/customer/PaymentMethodsScreen";
import ServiceHistoryScreen from "../screens/customer/ServiceHistoryScreen";
import FavoriteProvidersScreen from "../screens/customer/FavoriteProvidersScreen";
import HelpCenterScreen from "../screens/customer/HelpCenterScreen";
import ContactUsScreen from "../screens/customer/ContactUsScreen";
import RateAppScreen from "../screens/customer/RateAppScreen";
import TermsAndPoliciesScreen from "../screens/customer/TermsAndPoliciesScreen";
import SubscriptionPlanScreen from "../screens/customer/SubscriptionPlanScreen";
import CustomerReportsScreen from "../screens/customer/CustomerReportsScreen";
import CustomerQuoteDetailsScreen from "../screens/customer/CustomerQuoteDetailsScreen";
import ServiceApprovalScreen from "../screens/customer/ServiceApprovalScreen";

// FDACS Compliance Screens
import AppointmentsScreen from "../screens/customer/AppointmentsScreen";
import AppointmentDetailsScreen from "../screens/customer/AppointmentDetailsScreen";
import ScheduleAppointmentScreen from "../screens/customer/ScheduleAppointmentScreen";
import RepairInvoicesScreen from "../screens/customer/RepairInvoicesScreen";
import RepairInvoiceDetailsScreen from "../screens/customer/RepairInvoiceDetailsScreen";
import EstimateSharesScreen from "../screens/customer/EstimateSharesScreen";
import CompareEstimatesScreen from "../screens/customer/CompareEstimatesScreen";
import CustomerSOSScreen from "../screens/customer/CustomerSOSScreen";

// Car Wash Screens
import CarWashMapScreen from "../screens/CarWashMapScreen";
import CarWashProfileScreen from "../screens/CarWashProfileScreen";
import CarWashReviewScreen from "../screens/CarWashReviewScreen";
import CarWashAllReviewsScreen from "../screens/CarWashAllReviewsScreen";
import CarWashFavoritesScreen from "../screens/CarWashFavoritesScreen";

// Auto Services Wrapper
import AutoServicesScreen from "../screens/AutoServicesScreen";

// Parts Store Screens
import PartsStoreScreen from "../screens/PartsStoreScreen";
import PartsCategoryScreen from "../screens/PartsCategoryScreen";
import PartsProductDetailScreen from "../screens/PartsProductDetailScreen";
import PartsStoreProfileScreen from "../screens/PartsStoreProfileScreen";

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const VehiclesStackNav = createNativeStackNavigator<VehiclesStackParamList>();
const WorkOrdersStackNav = createNativeStackNavigator<WorkOrdersStackParamList>();
const CarWashStackNav = createNativeStackNavigator<CarWashStackParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();

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

function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="LandingMain" component={LandingScreen} />
      <HomeStackNav.Screen name="DashboardMain" component={CustomerDashboardScreen} />
      <HomeStackNav.Screen name="ServiceChoice" component={ServiceChoiceScreen} />
      <HomeStackNav.Screen name="CreateRequest" component={CreateRequestScreen} />
      <HomeStackNav.Screen name="RequestDetails" component={RequestDetailsScreen} />
      <HomeStackNav.Screen
        name="QuoteDetails"
        component={CustomerQuoteDetailsScreen}
      />
      <HomeStackNav.Screen name="Notifications" component={NotificationsScreen} />
      <HomeStackNav.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <HomeStackNav.Screen name="Appointments" component={AppointmentsScreen} />
      <HomeStackNav.Screen
        name="AppointmentDetails"
        component={AppointmentDetailsScreen}
      />
      <HomeStackNav.Screen
        name="ScheduleAppointment"
        component={ScheduleAppointmentScreen}
      />
      <HomeStackNav.Screen name="EstimateShares" component={EstimateSharesScreen} />
      <HomeStackNav.Screen
        name="CompareEstimates"
        component={CompareEstimatesScreen}
      />
      <HomeStackNav.Screen name="CarWashMap" component={CarWashMapScreen} />
      <HomeStackNav.Screen name="CarWashProfile" component={CarWashProfileScreen} />
      <HomeStackNav.Screen name="CarWashReview" component={CarWashReviewScreen} />
      <HomeStackNav.Screen name="CarWashAllReviews" component={CarWashAllReviewsScreen} />
      <HomeStackNav.Screen name="CarWashFavorites" component={CarWashFavoritesScreen} />
      <HomeStackNav.Screen name="PartsStore" component={PartsStoreScreen} />
      <HomeStackNav.Screen name="PartsCategory" component={PartsCategoryScreen} />
      <HomeStackNav.Screen name="PartsProductDetail" component={PartsProductDetailScreen} />
      <HomeStackNav.Screen name="PartsStoreProfile" component={PartsStoreProfileScreen} />
      <HomeStackNav.Screen name="ChatList" component={ChatListScreen} />
      <HomeStackNav.Screen name="Chat" component={ChatScreen} />
      <HomeStackNav.Screen name="HelpCenter" component={HelpCenterScreen} />
      <HomeStackNav.Screen name="ContactUs" component={ContactUsScreen} />
      <HomeStackNav.Screen name="SupportChat" component={SupportChatScreen} />
      <HomeStackNav.Screen name="RateApp" component={RateAppScreen} />
      <HomeStackNav.Screen name="TermsAndPolicies" component={TermsAndPoliciesScreen} />
      <HomeStackNav.Screen name="CustomerSOS" component={CustomerSOSScreen} />
    </HomeStackNav.Navigator>
  );
}

function VehiclesStack() {
  return (
    <VehiclesStackNav.Navigator screenOptions={{ headerShown: false }}>
      <VehiclesStackNav.Screen name="VehiclesList" component={CustomerVehiclesScreen} />
      <VehiclesStackNav.Screen name="AddVehicle" component={AddVehicleScreen} />
      <VehiclesStackNav.Screen name="VehicleDetails" component={VehicleDetailsScreen} />
      <VehiclesStackNav.Screen name="VehicleTransfer" component={VehicleTransferScreen} />
      <VehiclesStackNav.Screen name="Insurance" component={InsuranceScreen} />
    </VehiclesStackNav.Navigator>
  );
}

function WorkOrdersStack() {
  return (
    <WorkOrdersStackNav.Navigator screenOptions={{ headerShown: false }}>
      <WorkOrdersStackNav.Screen
        name="WorkOrdersList"
        component={CustomerWorkOrdersScreen}
      />
      <WorkOrdersStackNav.Screen name="RequestDetails" component={RequestDetailsScreen} />
      <WorkOrdersStackNav.Screen
        name="QuoteDetails"
        component={CustomerQuoteDetailsScreen}
      />
      <WorkOrdersStackNav.Screen
        name="WorkOrderDetails"
        component={WorkOrderDetailsScreen}
      />
      <WorkOrdersStackNav.Screen name="Payment" component={PaymentScreen} />
      <WorkOrdersStackNav.Screen
        name="ServiceApproval"
        component={ServiceApprovalScreen}
      />
      <WorkOrdersStackNav.Screen name="Rating" component={RatingScreen} />
      <WorkOrdersStackNav.Screen name="RepairInvoices" component={RepairInvoicesScreen} />
      <WorkOrdersStackNav.Screen
        name="RepairInvoiceDetails"
        component={RepairInvoiceDetailsScreen}
      />
      <WorkOrdersStackNav.Screen name="Appointments" component={AppointmentsScreen} />
      <WorkOrdersStackNav.Screen
        name="AppointmentDetails"
        component={AppointmentDetailsScreen}
      />
      <WorkOrdersStackNav.Screen
        name="ScheduleAppointment"
        component={ScheduleAppointmentScreen}
      />
      <WorkOrdersStackNav.Screen name="EstimateShares" component={EstimateSharesScreen} />
      <WorkOrdersStackNav.Screen
        name="CompareEstimates"
        component={CompareEstimatesScreen}
      />
      <WorkOrdersStackNav.Screen name="ChatList" component={ChatListScreen} />
      <WorkOrdersStackNav.Screen name="Chat" component={ChatScreen} />
      <WorkOrdersStackNav.Screen name="CarWashMap" component={CarWashMapScreen} />
      <WorkOrdersStackNav.Screen name="CarWashProfile" component={CarWashProfileScreen} />
      <WorkOrdersStackNav.Screen name="CarWashReview" component={CarWashReviewScreen} />
      <WorkOrdersStackNav.Screen name="CarWashAllReviews" component={CarWashAllReviewsScreen} />
      <WorkOrdersStackNav.Screen name="CarWashFavorites" component={CarWashFavoritesScreen} />
    </WorkOrdersStackNav.Navigator>
  );
}

function CarWashStack() {
  return (
    <CarWashStackNav.Navigator screenOptions={{ headerShown: false }}>
      <CarWashStackNav.Screen name="CarWashMapMain" component={AutoServicesScreen} />
      <CarWashStackNav.Screen name="CarWashProfile" component={CarWashProfileScreen} />
      <CarWashStackNav.Screen name="CarWashReview" component={CarWashReviewScreen} />
      <CarWashStackNav.Screen name="CarWashAllReviews" component={CarWashAllReviewsScreen} />
      <CarWashStackNav.Screen name="CarWashFavorites" component={CarWashFavoritesScreen} />
      <CarWashStackNav.Screen name="PartsStore" component={PartsStoreScreen} />
      <CarWashStackNav.Screen name="PartsCategory" component={PartsCategoryScreen} />
      <CarWashStackNav.Screen name="PartsProductDetail" component={PartsProductDetailScreen} />
      <CarWashStackNav.Screen name="PartsStoreProfile" component={PartsStoreProfileScreen} />
    </CarWashStackNav.Navigator>
  );
}

function ProfileStack() {
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen name="ProfileMain" component={CustomerProfileScreen} />
      <ProfileStackNav.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <ProfileStackNav.Screen name="Addresses" component={AddressesScreen} />
      <ProfileStackNav.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <ProfileStackNav.Screen name="ServiceHistory" component={ServiceHistoryScreen} />
      <ProfileStackNav.Screen
        name="ServiceHistoryWorkOrderDetails"
        component={WorkOrderDetailsScreen}
      />
      <ProfileStackNav.Screen
        name="FavoriteProviders"
        component={FavoriteProvidersScreen}
      />
      <ProfileStackNav.Screen name="Reports" component={CustomerReportsScreen} />
      <ProfileStackNav.Screen name="HelpCenter" component={HelpCenterScreen} />
      <ProfileStackNav.Screen name="ContactUs" component={ContactUsScreen} />
      <ProfileStackNav.Screen name="RateApp" component={RateAppScreen} />
      <ProfileStackNav.Screen
        name="TermsAndPolicies"
        component={TermsAndPoliciesScreen}
      />
      <ProfileStackNav.Screen
        name="SubscriptionPlan"
        component={SubscriptionPlanScreen}
      />
      <ProfileStackNav.Screen name="SupportChat" component={SupportChatScreen} />
      <ProfileStackNav.Screen name="ChatList" component={ChatListScreen} />
      <ProfileStackNav.Screen name="Chat" component={ChatScreen} />
      <ProfileStackNav.Screen name="MyVehicles" component={CustomerVehiclesScreen} />
      <ProfileStackNav.Screen name="AddVehicle" component={AddVehicleScreen} />
      <ProfileStackNav.Screen name="VehicleDetails" component={VehicleDetailsScreen} />
      <ProfileStackNav.Screen name="VehicleTransfer" component={VehicleTransferScreen} />
      <ProfileStackNav.Screen name="Insurance" component={InsuranceScreen} />
      <ProfileStackNav.Screen name="CarWashMap" component={CarWashMapScreen} />
      <ProfileStackNav.Screen name="CarWashProfile" component={CarWashProfileScreen} />
      <ProfileStackNav.Screen name="CarWashReview" component={CarWashReviewScreen} />
      <ProfileStackNav.Screen name="CarWashAllReviews" component={CarWashAllReviewsScreen} />
      <ProfileStackNav.Screen name="CarWashFavorites" component={CarWashFavoritesScreen} />
      <ProfileStackNav.Screen name="PartsStore" component={PartsStoreScreen} />
      <ProfileStackNav.Screen name="PartsCategory" component={PartsCategoryScreen} />
      <ProfileStackNav.Screen name="PartsProductDetail" component={PartsProductDetailScreen} />
      <ProfileStackNav.Screen name="PartsStoreProfile" component={PartsStoreProfileScreen} />
    </ProfileStackNav.Navigator>
  );
}

export default function CustomerNavigator() {
  const { t } = useI18n();
  const { unreadMessagesCount } = useNotifications();

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
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: t.nav?.home || "Home",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="home" color={color} size={size} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: "Home",
                    state: { routes: [{ name: "LandingMain" }] },
                  },
                ],
              }),
            );
          },
        })}
      />
      <Tab.Screen
        name="Services"
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
                    name: "Services",
                    state: { routes: [{ name: "WorkOrdersList" }] },
                  },
                ],
              }),
            );
          },
        })}
      />
      <Tab.Screen
        name="CarWash"
        component={CarWashStack}
        options={{
          tabBarLabel: t.carWash?.tabLabel || "Auto Care",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="car-wrench" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: "CarWash",
                    state: { routes: [{ name: "CarWashMapMain" }] },
                  },
                ],
              }),
            );
          },
        })}
      />
      <Tab.Screen
        name="Vehicles"
        component={VehiclesStack}
        options={{
          tabBarLabel: t.nav?.vehicles || "Vehicles",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="car" color={color} size={size} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: "Vehicles",
                    state: { routes: [{ name: "VehiclesList" }] },
                  },
                ],
              }),
            );
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: t.nav?.profile || "Profile",
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon
              name="person"
              color={color}
              size={size}
              badge={unreadMessagesCount}
            />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: "Profile",
                    state: { routes: [{ name: "ProfileMain" }] },
                  },
                ],
              }),
            );
          },
        })}
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
    right: -8,
    top: -4,
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
    fontWeight: "bold",
  },
});
