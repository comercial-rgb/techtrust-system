import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';

// Provider Screens
import ProviderDashboardScreen from '../screens/provider/ProviderDashboardScreen';
import ProviderRequestsScreen from '../screens/provider/ProviderRequestsScreen';
import ProviderRequestDetailsScreen from '../screens/provider/ProviderRequestDetailsScreen';
import ProviderQuotesScreen from '../screens/provider/ProviderQuotesScreen';
import ProviderQuoteDetailsScreen from '../screens/provider/ProviderQuoteDetailsScreen';
import ProviderWorkOrdersScreen from '../screens/provider/ProviderWorkOrdersScreen';
import ProviderWorkOrderDetailsScreen from '../screens/provider/ProviderWorkOrderDetailsScreen';
import ProviderProfileScreen from '../screens/provider/ProviderProfileScreen';

// Provider Profile Screens
import ProviderEditProfileScreen from '../screens/provider/ProviderEditProfileScreen';
import ProviderServicesScreen from '../screens/provider/ProviderServicesScreen';
import ProviderWorkingHoursScreen from '../screens/provider/ProviderWorkingHoursScreen';
import ProviderServiceAreaScreen from '../screens/provider/ProviderServiceAreaScreen';
import ProviderReportsScreen from '../screens/provider/ProviderReportsScreen';
import ProviderBankDetailsScreen from '../screens/provider/ProviderBankDetailsScreen';
import ProviderPaymentHistoryScreen from '../screens/provider/ProviderPaymentHistoryScreen';
import ProviderSecurityScreen from '../screens/provider/ProviderSecurityScreen';
import ProviderHelpScreen from '../screens/provider/ProviderHelpScreen';
import ProviderTermsAndPoliciesScreen from '../screens/provider/ProviderTermsAndPoliciesScreen';

// Common Screens
import NotificationsScreen from '../screens/NotificationsScreen';
import SupportChatScreen from '../screens/SupportChatScreen';
import ProviderReviewsScreen from '../screens/provider/ProviderReviewsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack for Dashboard (Home)
function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProviderDashboardMain" component={ProviderDashboardScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ProviderReviews" component={ProviderReviewsScreen} />
    </Stack.Navigator>
  );
}

// Stack for Requests (Pedidos)
function RequestsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProviderRequestsList" component={ProviderRequestsScreen} />
      <Stack.Screen name="ProviderRequestDetails" component={ProviderRequestDetailsScreen} />
    </Stack.Navigator>
  );
}

// Stack for Quotes (Orçamentos)
function QuotesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProviderQuotesList" component={ProviderQuotesScreen} />
      <Stack.Screen name="ProviderQuoteDetails" component={ProviderQuoteDetailsScreen} />
    </Stack.Navigator>
  );
}

// Stack for Work Orders (Serviços)
function WorkOrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProviderWorkOrdersList" component={ProviderWorkOrdersScreen} />
      <Stack.Screen name="ProviderWorkOrderDetails" component={ProviderWorkOrderDetailsScreen} />
    </Stack.Navigator>
  );
}

// Stack for Profile
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProviderProfileMain" component={ProviderProfileScreen} />
      <Stack.Screen name="EditProfile" component={ProviderEditProfileScreen} />
      <Stack.Screen name="Services" component={ProviderServicesScreen} />
      <Stack.Screen name="WorkingHours" component={ProviderWorkingHoursScreen} />
      <Stack.Screen name="ServiceArea" component={ProviderServiceAreaScreen} />
      <Stack.Screen name="Reports" component={ProviderReportsScreen} />
      <Stack.Screen name="BankDetails" component={ProviderBankDetailsScreen} />
      <Stack.Screen name="PaymentHistory" component={ProviderPaymentHistoryScreen} />
      <Stack.Screen name="Security" component={ProviderSecurityScreen} />
      <Stack.Screen name="Help" component={ProviderHelpScreen} />
      <Stack.Screen name="TermsAndPolicies" component={ProviderTermsAndPoliciesScreen} />
      <Stack.Screen name="SupportChat" component={SupportChatScreen} />
    </Stack.Navigator>
  );
}

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

export default function ProviderNavigator() {
  // Mock badge count - em produção, buscar do estado/API
  const pendingRequestsCount = 3;

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
        name="ProviderDashboard"
        component={DashboardStack}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="home" color={color} size={size} />
          ),
        }}
      />
      
      <Tab.Screen
        name="ProviderRequests"
        component={RequestsStack}
        options={{
          tabBarLabel: 'Pedidos',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon 
              name="document-text" 
              color={color} 
              size={size} 
              badge={pendingRequestsCount}
            />
          ),
        }}
      />
      
      <Tab.Screen
        name="ProviderQuotes"
        component={QuotesStack}
        options={{
          tabBarLabel: 'Orçamentos',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="pricetag" color={color} size={size} />
          ),
        }}
      />
      
      <Tab.Screen
        name="ProviderWorkOrders"
        component={WorkOrdersStack}
        options={{
          tabBarLabel: 'Serviços',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="construct" color={color} size={size} />
          ),
        }}
      />
      
      <Tab.Screen
        name="ProviderProfile"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Perfil',
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
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
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
    fontWeight: '700',
  },
});
