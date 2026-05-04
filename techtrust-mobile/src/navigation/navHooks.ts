/**
 * Typed `useNavigation()` helpers — use only under the matching navigator tree
 * (e.g. `useAuthStackNavigation` on screens inside `AuthStack` only).
 */
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type {
  AuthStackParamList,
  CustomerTabParamList,
  HomeStackParamList,
  ProviderRequestsAndQuotesStackParamList,
  WorkOrdersStackParamList,
} from "./types";

export function useAuthStackNavigation() {
  return useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
}

export function useCustomerTabNavigation() {
  return useNavigation<BottomTabNavigationProp<CustomerTabParamList>>();
}

export function useHomeStackNavigation() {
  return useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
}

export function useWorkOrdersStackNavigation() {
  return useNavigation<NativeStackNavigationProp<WorkOrdersStackParamList>>();
}

export function useProviderRequestsStackNavigation() {
  return useNavigation<
    NativeStackNavigationProp<ProviderRequestsAndQuotesStackParamList>
  >();
}
