/**
 * App Principal - TechTrust Mobile
 * Atualizado com PaymentScreen e RatingScreen
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import OTPScreen from './src/screens/OTPScreen';

// App Screens
import DashboardScreen from './src/screens/DashboardScreen';
import VehiclesScreen from './src/screens/VehiclesScreen';
import AddVehicleScreen from './src/screens/AddVehicleScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreateRequestScreen from './src/screens/CreateRequestScreen';
import RequestDetailsScreen from './src/screens/RequestDetailsScreen';
import WorkOrdersScreen from './src/screens/WorkOrdersScreen';
import WorkOrderDetailsScreen from './src/screens/WorkOrderDetailsScreen';

// ✅ NOVAS TELAS
import PaymentScreen from './src/screens/PaymentScreen';
import RatingScreen from './src/screens/RatingScreen';

// Tipos para navegação (opcional, mas recomendado)
export type RootStackParamList = {
  // Auth
  Login: undefined;
  Signup: undefined;
  OTP: { phone?: string };
  // App
  Home: undefined;
  AddVehicle: undefined;
  CreateRequest: undefined;
  RequestDetails: { requestId: string };
  WorkOrderDetails: { workOrderId: string };
  // ✅ NOVAS ROTAS
  Payment: {
    serviceData?: {
      provider?: string;
      service?: string;
      date?: string;
      time?: string;
      duration?: string;
      basePrice?: number;
      serviceFee?: number;
      total?: number;
    };
  };
  Rating: {
    serviceData?: {
      provider?: string;
      providerAvatar?: string;
      service?: string;
      date?: string;
      duration?: string;
      price?: string;
    };
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const theme = {
  colors: {
    primary: '#1976d2',
    secondary: '#03a9f4',
    background: '#fff',
    surface: '#fff',
    error: '#f44336',
  },
};

// Bottom Tab Navigator (quando logado)
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#666',
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="WorkOrdersTab"
        component={WorkOrdersScreen}
        options={{
          title: 'Serviços',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="toolbox" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="VehiclesTab"
        component={VehiclesScreen}
        options={{
          title: 'Veículos',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="car" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Ou uma tela de loading
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {!user ? (
        // Auth Stack
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ title: 'Cadastro' }}
          />
          <Stack.Screen
            name="OTP"
            component={OTPScreen}
            options={{ title: 'Verificação' }}
          />
        </>
      ) : (
        // App Stack
        <>
          <Stack.Screen
            name="Home"
            component={AppTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddVehicle"
            component={AddVehicleScreen}
            options={{ title: 'Adicionar Veículo' }}
          />
          <Stack.Screen
            name="CreateRequest"
            component={CreateRequestScreen}
            options={{ title: 'Nova Solicitação' }}
          />
          <Stack.Screen
            name="RequestDetails"
            component={RequestDetailsScreen}
            options={{ title: 'Detalhes da Solicitação' }}
          />
          <Stack.Screen
            name="WorkOrderDetails"
            component={WorkOrderDetailsScreen}
            options={{ title: 'Detalhes do Serviço' }}
          />
          
          {/* ✅ NOVAS TELAS */}
          <Stack.Screen
            name="Payment"
            component={PaymentScreen}
            options={{ 
              title: 'Pagamento',
              headerStyle: { backgroundColor: '#1976d2' },
            }}
          />
          <Stack.Screen
            name="Rating"
            component={RatingScreen}
            options={{ 
              title: 'Avaliar Serviço',
              headerStyle: { backgroundColor: '#8b5cf6' },
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <NavigationContainer>
            <Navigation />
          </NavigationContainer>
          <StatusBar style="light" />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
