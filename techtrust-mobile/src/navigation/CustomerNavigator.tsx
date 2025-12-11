import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '../i18n';
import { useNotifications } from '../contexts/NotificationsContext';
import { CommonActions } from '@react-navigation/native';

// Customer Screens - NOVAS TELAS COM DESIGN MODERNO E DADOS MOCKADOS
import LandingScreen from '../screens/LandingScreen';
import CustomerDashboardScreen from '../screens/CustomerDashboardScreen';
import CustomerVehiclesScreen from '../screens/CustomerVehiclesScreen';
import CustomerWorkOrdersScreen from '../screens/CustomerWorkOrdersScreen';
import CustomerProfileScreen from '../screens/CustomerProfileScreen';

// Telas auxiliares
import AddVehicleScreen from '../screens/AddVehicleScreen';
import VehicleDetailsScreen from '../screens/VehicleDetailsScreen';
import VehicleTransferScreen from '../screens/VehicleTransferScreen';
import InsuranceScreen from '../screens/InsuranceScreen';
import CreateRequestScreen from '../screens/CreateRequestScreen';
import RequestDetailsScreen from '../screens/RequestDetailsScreen';
import WorkOrderDetailsScreen from '../screens/WorkOrderDetailsScreen';
import PaymentScreen from '../screens/PaymentScreen';
import RatingScreen from '../screens/RatingScreen';

// Chat Screens
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';

// Notifications Screen
import NotificationsScreen from '../screens/NotificationsScreen';

// Support Chat Screen
import SupportChatScreen from '../screens/SupportChatScreen';

// Customer Profile Screens
import PersonalInfoScreen from '../screens/customer/PersonalInfoScreen';
import AddressesScreen from '../screens/customer/AddressesScreen';
import PaymentMethodsScreen from '../screens/customer/PaymentMethodsScreen';
import ServiceHistoryScreen from '../screens/customer/ServiceHistoryScreen';
import FavoriteProvidersScreen from '../screens/customer/FavoriteProvidersScreen';
import HelpCenterScreen from '../screens/customer/HelpCenterScreen';
import ContactUsScreen from '../screens/customer/ContactUsScreen';
import RateAppScreen from '../screens/customer/RateAppScreen';
import TermsAndPoliciesScreen from '../screens/customer/TermsAndPoliciesScreen';
import SubscriptionPlanScreen from '../screens/customer/SubscriptionPlanScreen';
import CustomerReportsScreen from '../screens/customer/CustomerReportsScreen';
import CustomerQuoteDetailsScreen from '../screens/customer/CustomerQuoteDetailsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Custom Tab Bar Icon with Badge
function TabBarIcon({ 
  name, 
  color, 
  size, 
  badge 
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
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LandingMain" component={LandingScreen} />
    </Stack.Navigator>
  );
}

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={CustomerDashboardScreen} />
      <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
      <Stack.Screen name="RequestDetails" component={RequestDetailsScreen} />
      <Stack.Screen name="QuoteDetails" component={CustomerQuoteDetailsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

function VehiclesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="VehiclesList" component={CustomerVehiclesScreen} />
      <Stack.Screen name="AddVehicle" component={AddVehicleScreen} />
      <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} />
      <Stack.Screen name="VehicleTransfer" component={VehicleTransferScreen} />
      <Stack.Screen name="Insurance" component={InsuranceScreen} />
    </Stack.Navigator>
  );
}

function WorkOrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkOrdersList" component={CustomerWorkOrdersScreen} />
      <Stack.Screen name="WorkOrderDetails" component={WorkOrderDetailsScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Rating" component={RatingScreen} />
    </Stack.Navigator>
  );
}

function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={CustomerProfileScreen} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="Addresses" component={AddressesScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="ServiceHistory" component={ServiceHistoryScreen} />
      <Stack.Screen name="ServiceHistoryWorkOrderDetails" component={WorkOrderDetailsScreen} />
      <Stack.Screen name="FavoriteProviders" component={FavoriteProvidersScreen} />
      <Stack.Screen name="Reports" component={CustomerReportsScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="ContactUs" component={ContactUsScreen} />
      <Stack.Screen name="RateApp" component={RateAppScreen} />
      <Stack.Screen name="TermsAndPolicies" component={TermsAndPoliciesScreen} />
      <Stack.Screen name="SubscriptionPlan" component={SubscriptionPlanScreen} />
      <Stack.Screen name="SupportChat" component={SupportChatScreen} />
    </Stack.Navigator>
  );
}

export default function CustomerNavigator() {
  const { t } = useI18n();
  const { unreadMessagesCount } = useNotifications();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          height: 85,
          paddingTop: 8,
          paddingBottom: 25,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: t.nav?.home || 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="home" color={color} size={size} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Reset stack to Landing when tab is pressed
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Home', state: { routes: [{ name: 'LandingMain' }] } }],
              })
            );
          },
        })}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarLabel: t.nav?.dashboard || 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="grid" color={color} size={size} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Dashboard', state: { routes: [{ name: 'DashboardMain' }] } }],
              })
            );
          },
        })}
      />
      <Tab.Screen
        name="Vehicles"
        component={VehiclesStack}
        options={{
          tabBarLabel: t.nav?.vehicles || 'Vehicles',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="car" color={color} size={size} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Vehicles', state: { routes: [{ name: 'VehiclesList' }] } }],
              })
            );
          },
        })}
      />
      <Tab.Screen
        name="Services"
        component={WorkOrdersStack}
        options={{
          tabBarLabel: t.nav?.services || 'Services',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="construct" color={color} size={size} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Services', state: { routes: [{ name: 'WorkOrdersList' }] } }],
              })
            );
          },
        })}
      />
      <Tab.Screen
        name="Messages"
        component={ChatStack}
        options={{
          tabBarLabel: t.nav?.chat || 'Messages',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon 
              name="chatbubbles" 
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
                routes: [{ name: 'Messages', state: { routes: [{ name: 'ChatList' }] } }],
              })
            );
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: t.nav?.profile || 'Profile',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="person" color={color} size={size} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Always reset Profile stack to ProfileMain when tab is pressed
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Profile', state: { routes: [{ name: 'ProfileMain' }] } }],
              })
            );
          },
        })}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
