/**
 * React Navigation param lists — single source of truth for stack/tab routes.
 * Extend screen params here when adding `navigation.navigate(...)` payloads.
 */

import type {
  CompositeNavigationProp,
  NavigatorScreenParams,
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";

// ─── Shared route params (reused across stacks) ───

/** Customer policy document tab + legacy landing "about" → terms */
export type CustomerTermsPoliciesTab =
  | "terms"
  | "privacy"
  | "tracking"
  | "refund"
  | "about";

export type TermsAndPoliciesParams = {
  initialTab?: CustomerTermsPoliciesTab;
};

export type ChatScreenParams = {
  chatId?: string;
  requestId?: string;
  conversationId?: string;
  serviceRequestId?: string;
  participant?: {
    id: string;
    name: string;
    role?: "customer" | "provider";
    phone?: string;
    email?: string;
    isOnline?: boolean;
    address?: string;
    rating?: number;
    totalServices?: number;
    memberSince?: string;
    verified?: boolean;
  };
};

export type SupportChatParams = {
  subject?: string;
};

export type OTPParams = {
  userId?: string;
  phone?: string;
  otpMethod?: "sms" | "email";
  email?: string;
  fromSocialSignup?: boolean;
  selectedPlan?: string;
};

export type CompleteSocialSignupParams = {
  userId: string;
  email?: string;
  fullName?: string;
  phone?: string | null;
  provider?: string;
};

/** Article payload from dashboard / lists */
export type ArticleDetailParams = {
  article: {
    id: string;
    title: string;
    summary?: string;
    content?: string;
    imageUrl?: string;
    slug: string;
    publishDate: string;
    author?: string;
  };
};

export type CreateRequestParams = {
  preSelectedProvider?: Record<string, unknown>;
  specialOffer?: Record<string, unknown> | null;
  editRequestId?: string;
  editData?: Record<string, unknown>;
  /** Legacy / deep-link style (some callers still pass flat ids) */
  providerId?: string;
  providerName?: string;
  /** Pre-fill from vehicle context (e.g. vehicles list / vehicle details) */
  vehicleId?: string;
};

// ─── Auth (logged-out + pre-customer) ───

export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  AccountType: undefined;
  Signup:
    | {
        initialRole?: "CLIENT" | "PROVIDER" | "MARKETPLACE";
      }
    | undefined;
  OTP: OTPParams | undefined;
  ForgotPassword: undefined;
  CompleteSocialSignup: CompleteSocialSignupParams;
  TermsAndPolicies: TermsAndPoliciesParams | undefined;
  HelpCenter: undefined;
  ContactUs: undefined;
  SupportChat: SupportChatParams | undefined;
  RateApp: undefined;
};

export type MarketplaceOnboardingStackParamList = {
  MarketplaceOnboarding: undefined;
  ProviderMain: undefined;
};

export type ProviderOnboardingStackParamList = {
  ProviderOnboarding: undefined;
  ProviderMain: undefined;
  OnboardingServices: undefined;
};

// ─── Customer tab → stacks ───

export type HomeStackParamList = {
  LandingMain: undefined;
  DashboardMain: undefined;
  ServiceChoice: { preselectedService?: string } | undefined;
  CreateRequest: CreateRequestParams | undefined;
  RequestDetails: { requestId: string };
  QuoteDetails: { quoteId: string };
  Notifications: undefined;
  ArticleDetail: ArticleDetailParams;
  Appointments: undefined;
  AppointmentDetails: { appointmentId: string } | undefined;
  ScheduleAppointment: Record<string, unknown> | undefined;
  EstimateShares: undefined;
  CompareEstimates: { shareId?: string } | undefined;
  CarWashMap: undefined;
  CarWashProfile: { carWashId?: string } | Record<string, unknown> | undefined;
  CarWashReview: Record<string, unknown> | undefined;
  CarWashAllReviews: Record<string, unknown> | undefined;
  CarWashFavorites: undefined;
  PartsStore: Record<string, unknown> | undefined;
  PartsCategory: { categoryId?: string } | Record<string, unknown> | undefined;
  PartsProductDetail: { productId?: string } | Record<string, unknown> | undefined;
  PartsStoreProfile: { storeId?: string } | Record<string, unknown> | undefined;
  ChatList: undefined;
  Chat: ChatScreenParams | undefined;
  HelpCenter: { fromDashboard?: boolean } | undefined;
  ContactUs: undefined;
  SupportChat: SupportChatParams | undefined;
  RateApp: undefined;
  TermsAndPolicies: TermsAndPoliciesParams | undefined;
  CustomerSOS: { vehicleId?: string } | undefined;
};

export type VehiclesStackParamList = {
  VehiclesList: { newVehicle?: Record<string, unknown> } | undefined;
  AddVehicle:
    | { fromOnboarding?: boolean; vehicle?: Record<string, unknown> }
    | undefined;
  VehicleDetails:
    | { vehicleId: string; showOnboarding?: boolean }
    | Record<string, unknown>
    | undefined;
  VehicleTransfer: Record<string, unknown> | undefined;
  Insurance:
    | {
        vehicleId?: string;
        vehicleMake?: string;
        vehicleModel?: string;
        vehicleYear?: number;
      }
    | Record<string, unknown>
    | undefined;
};

export type WorkOrdersStackParamList = {
  WorkOrdersList: undefined;
  RequestDetails: { requestId: string };
  QuoteDetails: { quoteId: string };
  WorkOrderDetails: { workOrderId: string; fromVehicleDetails?: boolean };
  Payment: {
    workOrderId?: string;
    orderNumber?: string;
    serviceTitle?: string;
    providerName?: string;
    amount?: number;
  };
  ServiceApproval: { workOrderId: string };
  Rating:
    | {
        workOrderId?: string;
        providerId?: string;
        serviceTitle?: string;
        providerName?: string;
        serviceDate?: string;
      }
    | undefined;
  RepairInvoices: undefined;
  RepairInvoiceDetails: { invoiceId: string } | Record<string, unknown> | undefined;
  Appointments: undefined;
  AppointmentDetails: { appointmentId: string } | undefined;
  ScheduleAppointment: Record<string, unknown> | undefined;
  EstimateShares: undefined;
  CompareEstimates: { shareId?: string } | undefined;
  ChatList: undefined;
  Chat: ChatScreenParams | undefined;
  CarWashMap: undefined;
  CarWashProfile: Record<string, unknown> | undefined;
  CarWashReview: Record<string, unknown> | undefined;
  CarWashAllReviews: Record<string, unknown> | undefined;
  CarWashFavorites: undefined;
};

export type CarWashStackParamList = {
  CarWashMapMain: undefined;
  CarWashProfile: Record<string, unknown> | undefined;
  CarWashReview: Record<string, unknown> | undefined;
  CarWashAllReviews: Record<string, unknown> | undefined;
  CarWashFavorites: undefined;
  PartsStore: Record<string, unknown> | undefined;
  PartsCategory: Record<string, unknown> | undefined;
  PartsProductDetail: Record<string, unknown> | undefined;
  PartsStoreProfile: Record<string, unknown> | undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  PersonalInfo: undefined;
  Addresses: undefined;
  PaymentMethods:
    | {
        addCardMode?: boolean;
        fromDashboard?: boolean;
        fromCreateRequest?: boolean;
      }
    | undefined;
  ServiceHistory: undefined;
  ServiceHistoryWorkOrderDetails: { workOrderId: string };
  FavoriteProviders: undefined;
  Reports: undefined;
  HelpCenter: { fromDashboard?: boolean } | undefined;
  ContactUs: undefined;
  RateApp: undefined;
  TermsAndPolicies: TermsAndPoliciesParams | undefined;
  SubscriptionPlan: { fromDashboard?: boolean } | undefined;
  SupportChat: SupportChatParams | undefined;
  ChatList: undefined;
  Chat: ChatScreenParams | undefined;
  MyVehicles: undefined;
  AddVehicle:
    | { fromOnboarding?: boolean; vehicle?: Record<string, unknown> }
    | undefined;
  VehicleDetails:
    | { vehicleId: string; showOnboarding?: boolean }
    | Record<string, unknown>
    | undefined;
  VehicleTransfer: Record<string, unknown> | undefined;
  Insurance:
    | {
        vehicleId?: string;
        vehicleMake?: string;
        vehicleModel?: string;
        vehicleYear?: number;
      }
    | Record<string, unknown>
    | undefined;
  CarWashMap: undefined;
  CarWashProfile: Record<string, unknown> | undefined;
  CarWashReview: Record<string, unknown> | undefined;
  CarWashAllReviews: Record<string, unknown> | undefined;
  CarWashFavorites: undefined;
  PartsStore: Record<string, unknown> | undefined;
  PartsCategory: Record<string, unknown> | undefined;
  PartsProductDetail: Record<string, unknown> | undefined;
  PartsStoreProfile: Record<string, unknown> | undefined;
};

export type CustomerTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Services: NavigatorScreenParams<WorkOrdersStackParamList>;
  CarWash: NavigatorScreenParams<CarWashStackParamList>;
  Vehicles: NavigatorScreenParams<VehiclesStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// ─── Customer onboarding gate (root stack) — after tabs so `CustomerMain` can nest tab params

export type CustomerOnboardingStackParamList = {
  CustomerOnboarding: undefined;
  CustomerMain: NavigatorScreenParams<CustomerTabParamList> | undefined;
};

/**
 * Services tab native stack combined with parent bottom tabs — supports
 * in-stack routes and `navigate("Home", { screen: "…" })` with typed tab + stack props.
 */
export type CustomerServicesStackNavigation<
  T extends keyof WorkOrdersStackParamList,
> = CompositeNavigationProp<
  NativeStackNavigationProp<WorkOrdersStackParamList, T>,
  BottomTabNavigationProp<CustomerTabParamList>
>;

/**
 * Home stack + customer bottom tabs — dashboard, cross-tab jumps, nested tab screens.
 */
export type CustomerHomeStackNavigation<
  T extends keyof HomeStackParamList,
> = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, T>,
  BottomTabNavigationProp<CustomerTabParamList>
>;

/** Profile stack + customer bottom tabs */
export type CustomerProfileStackNavigation<
  T extends keyof ProfileStackParamList,
> = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList, T>,
  BottomTabNavigationProp<CustomerTabParamList>
>;

/** Shared schedule screen on customer Home/Services stacks and provider dashboard */
export type ScheduleAppointmentScreenRoute =
  | RouteProp<HomeStackParamList, "ScheduleAppointment">
  | RouteProp<WorkOrdersStackParamList, "ScheduleAppointment">
  | RouteProp<ProviderDashboardStackParamList, "ScheduleAppointment">;

export type CarWashProfileScreenRoute =
  | RouteProp<HomeStackParamList, "CarWashProfile">
  | RouteProp<WorkOrdersStackParamList, "CarWashProfile">
  | RouteProp<ProfileStackParamList, "CarWashProfile">
  | RouteProp<CarWashStackParamList, "CarWashProfile">;

export type CarWashProfileScreenNavigation =
  NativeStackNavigationProp<CustomerAppParamList, "CarWashProfile">;

export type VehicleTransferScreenRoute =
  | RouteProp<VehiclesStackParamList, "VehicleTransfer">
  | RouteProp<ProfileStackParamList, "VehicleTransfer">;

export type VehicleTransferScreenNavigation =
  NativeStackNavigationProp<CustomerAppParamList, "VehicleTransfer">;

export type InsuranceScreenRoute =
  | RouteProp<VehiclesStackParamList, "Insurance">
  | RouteProp<ProfileStackParamList, "Insurance">;

export type InsuranceScreenNavigation =
  NativeStackNavigationProp<CustomerAppParamList, "Insurance">;

export type AppointmentDetailsScreenRoute =
  | RouteProp<HomeStackParamList, "AppointmentDetails">
  | RouteProp<WorkOrdersStackParamList, "AppointmentDetails">
  | RouteProp<ProviderDashboardStackParamList, "AppointmentDetails">;

// ─── Provider tab → stacks ───

export type ProviderDashboardStackParamList = {
  ProviderDashboardMain: undefined;
  Notifications: undefined;
  ChatList: undefined;
  Chat: ChatScreenParams | undefined;
  ProviderReviews: undefined;
  ProviderBusiness: undefined;
  SOSInbox: undefined;
  SOSRateCard: undefined;
  Appointments: undefined;
  AppointmentDetails: { appointmentId: string } | undefined;
  ScheduleAppointment: Record<string, unknown> | undefined;
  EditProfile: undefined;
  Services: undefined;
  WorkingHours: undefined;
  ServiceArea: undefined;
};

export type ProviderRequestsAndQuotesStackParamList = {
  RequestsAndQuotesMain: undefined;
  ProviderRequestsList: undefined;
  ProviderRequestDetails: { requestId: string; action?: string };
  ProviderQuotesList: undefined;
  ProviderQuoteDetails: { quoteId: string } | Record<string, unknown> | undefined;
  QuoteWorkOrderDetails: { workOrderId: string } | Record<string, unknown> | undefined;
  EstimateShares: undefined;
  CompareEstimates: { shareId?: string } | undefined;
  Chat: ChatScreenParams | undefined;
};

export type ProviderWorkOrdersStackParamList = {
  ProviderWorkOrdersList: undefined;
  ProviderWorkOrderDetails: { workOrderId: string } | Record<string, unknown> | undefined;
  Chat: ChatScreenParams | undefined;
  RepairInvoices: undefined;
  RepairInvoiceDetails: { invoiceId: string } | Record<string, unknown> | undefined;
};

/** Same component on work-orders stack (`ProviderWorkOrderDetails`) and R&Q stack (`QuoteWorkOrderDetails`) */
export type ProviderWorkOrderDetailsScreenRoute =
  | RouteProp<ProviderWorkOrdersStackParamList, "ProviderWorkOrderDetails">
  | RouteProp<ProviderRequestsAndQuotesStackParamList, "QuoteWorkOrderDetails">;

export type ProviderMessagesStackParamList = {
  ChatListMain: undefined;
  Chat: ChatScreenParams | undefined;
};

export type ProviderProfileStackParamList = {
  ProviderProfileMain: undefined;
  EditProfile: undefined;
  ProviderBusiness: undefined;
  Services: undefined;
  WorkingHours: undefined;
  ServiceArea: undefined;
  Reports: undefined;
  BankDetails: undefined;
  PaymentHistory: undefined;
  Security: undefined;
  Help: undefined;
  TermsAndPolicies: undefined;
  Compliance: undefined;
  ComplianceItemDetail: { item: Record<string, unknown> } | Record<string, unknown> | undefined;
  TechnicianManagement: undefined;
  InsuranceManagement: undefined;
  SupportChat: SupportChatParams | undefined;
};

export type ProviderTabParamList = {
  ProviderDashboard: NavigatorScreenParams<ProviderDashboardStackParamList>;
  ProviderRequests: NavigatorScreenParams<ProviderRequestsAndQuotesStackParamList>;
  ProviderWorkOrders: NavigatorScreenParams<ProviderWorkOrdersStackParamList>;
  ProviderMessages: NavigatorScreenParams<ProviderMessagesStackParamList>;
  ProviderProfile: NavigatorScreenParams<ProviderProfileStackParamList>;
};

/** Provider profile stack + bottom tabs */
export type ProviderProfileStackNavigation<
  T extends keyof ProviderProfileStackParamList,
> = CompositeNavigationProp<
  NativeStackNavigationProp<ProviderProfileStackParamList, T>,
  BottomTabNavigationProp<ProviderTabParamList>
>;

/**
 * Provider dashboard stack + bottom tabs — jump to Requests / Work Orders tabs, etc.
 */
export type ProviderDashboardStackNavigation<
  T extends keyof ProviderDashboardStackParamList,
> = CompositeNavigationProp<
  NativeStackNavigationProp<ProviderDashboardStackParamList, T>,
  BottomTabNavigationProp<ProviderTabParamList>
>;

/**
 * Requests & quotes stack + provider tabs — e.g. quotes list → `ProviderRequests` tab.
 */
export type ProviderRequestsQuotesStackNavigation<
  T extends keyof ProviderRequestsAndQuotesStackParamList,
> = CompositeNavigationProp<
  NativeStackNavigationProp<ProviderRequestsAndQuotesStackParamList, T>,
  BottomTabNavigationProp<ProviderTabParamList>
>;

/**
 * Cast from `RequestsAndQuotesMain` stack navigation at runtime — tab `navigate` is available.
 * @see ProviderNavigator RequestsAndQuotesScreen
 */
export type EmbeddedRequestsQuotesNavigationCast<
  T extends keyof ProviderRequestsAndQuotesStackParamList,
> = ProviderRequestsQuotesStackNavigation<T>;

/** In-stack only — provider work orders list has no tab jumps in current code paths */
export type ProviderWorkOrdersListScreenNavigation = NativeStackNavigationProp<
  ProviderWorkOrdersStackParamList,
  "ProviderWorkOrdersList"
>;

/** Tab + stacks merged — use for `navigation` on customer screens that jump tabs or stacks */
export type CustomerAppParamList = CustomerTabParamList &
  HomeStackParamList &
  WorkOrdersStackParamList &
  ProfileStackParamList &
  CarWashStackParamList &
  VehiclesStackParamList;

/** Navigation for customer screens registered on tab stacks (Home, Work Orders, Profile, etc.) */
export type CustomerAppNavigation = NativeStackNavigationProp<CustomerAppParamList>;

/**
 * Narrow `navigate` for the rare jump from a customer screen into the provider app’s
 * work-orders tab (e.g. provider viewing client requests from Appointments).
 */
export type NavigateProviderWorkOrderFromCustomer = {
  navigate(
    name: "ProviderWorkOrders",
    params: {
      screen: "ProviderWorkOrderDetails";
      params: { workOrderId: string };
    },
  ): void;
};

/** Provider tab + stacks merged */
export type ProviderAppParamList = ProviderTabParamList &
  ProviderDashboardStackParamList &
  ProviderRequestsAndQuotesStackParamList &
  ProviderWorkOrdersStackParamList &
  ProviderMessagesStackParamList &
  ProviderProfileStackParamList;

/** Navigation for provider screens on tab stacks */
export type ProviderAppNavigation = NativeStackNavigationProp<ProviderAppParamList>;

/** Screens shared between customer and provider navigators (e.g. FDACS flows) */
export type CustomerProviderMergedParamList = CustomerAppParamList &
  ProviderAppParamList;

/**
 * Car wash map — typed as full customer graph. The Car Wash tab embeds this screen
 * with a stack-only `navigation`; callers may cast (see `AutoServicesScreen`).
 */
export type CustomerCarWashMapScreenNavigation =
  NativeStackNavigationProp<CustomerAppParamList>;

export type WorkOrderDetailsScreenNavigation =
  NativeStackNavigationProp<CustomerAppParamList>;

/** Shared customer + provider work-orders stack screen (only `goBack` / cross-app routes) */
export type RepairInvoiceDetailsScreenNavigation =
  NativeStackNavigationProp<CustomerProviderMergedParamList>;

export type ScheduleAppointmentScreenNavigation =
  NativeStackNavigationProp<CustomerProviderMergedParamList>;

export type AppointmentDetailsScreenNavigation =
  NativeStackNavigationProp<CustomerProviderMergedParamList>;

// ─── Screen props helpers (optional import from screens) ───

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

/** Same `TermsAndPolicies` params on auth, home, and profile stacks */
export type TermsAndPoliciesScreenProps = NativeStackScreenProps<
  Pick<AuthStackParamList, "TermsAndPolicies">,
  "TermsAndPolicies"
>;

/** `Chat` is registered with the same params in multiple stacks */
export type ChatRouteParamList = { Chat: ChatScreenParams | undefined };
export type ChatScreenProps = {
  /** Union of customer/provider merged lists makes `navigate` un-callable in TS — keep loose here */
  navigation: NavigationProp<ParamListBase>;
  route: RouteProp<ChatRouteParamList, "Chat">;
};

export type CreateRequestRouteParamList = Pick<
  HomeStackParamList,
  "CreateRequest"
>;
export type CreateRequestScreenProps = {
  navigation: NativeStackNavigationProp<CustomerAppParamList, "CreateRequest">;
  route: RouteProp<HomeStackParamList, "CreateRequest">;
};

export type RequestDetailsRouteParamList = Pick<
  HomeStackParamList,
  "RequestDetails"
>;
export type RequestDetailsScreenProps = {
  navigation: NativeStackNavigationProp<
    CustomerAppParamList,
    "RequestDetails"
  >;
  route: RouteProp<HomeStackParamList, "RequestDetails">;
};

export type PaymentRouteParamList = Pick<WorkOrdersStackParamList, "Payment">;
export type PaymentScreenProps = {
  navigation: NativeStackNavigationProp<CustomerAppParamList, "Payment">;
  route: RouteProp<WorkOrdersStackParamList, "Payment">;
};

export type ProviderRequestDetailsScreenProps = {
  navigation: NativeStackNavigationProp<
    ProviderAppParamList,
    "ProviderRequestDetails"
  >;
  route: RouteProp<
    Pick<ProviderRequestsAndQuotesStackParamList, "ProviderRequestDetails">,
    "ProviderRequestDetails"
  >;
};

export type ProviderQuoteDetailsScreenProps = {
  navigation: NativeStackNavigationProp<
    ProviderAppParamList,
    "ProviderQuoteDetails"
  >;
  route: RouteProp<
    Pick<ProviderRequestsAndQuotesStackParamList, "ProviderQuoteDetails">,
    "ProviderQuoteDetails"
  >;
};

/** `RateApp` is on auth, home, and profile stacks — union keeps `goBack` / store flows typed */
export type RateAppNavigation =
  | NativeStackNavigationProp<AuthStackParamList, "RateApp">
  | NativeStackNavigationProp<CustomerAppParamList, "RateApp">;

/** Auth `Landing` + Home `LandingMain` share one screen — intersecting param lists breaks `HelpCenter`; keep loose like `ChatScreen`. */
export type LandingScreenNavigation = NavigationProp<ParamListBase>;

/** Customer + provider stacks both register this screen; union breaks `navigate` typing */
export type NotificationsScreenNavigation = NavigationProp<ParamListBase>;

export type ProviderSOSInboxScreenProps =
  NativeStackScreenProps<ProviderDashboardStackParamList, "SOSInbox">;

/** Stack helpers — prefer these over `any` on screen props */
export type HomeStackScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;

export type WorkOrdersStackScreenProps<T extends keyof WorkOrdersStackParamList> =
  NativeStackScreenProps<WorkOrdersStackParamList, T>;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
  NativeStackScreenProps<ProfileStackParamList, T>;

export type VehiclesStackScreenProps<T extends keyof VehiclesStackParamList> =
  NativeStackScreenProps<VehiclesStackParamList, T>;

export type CarWashStackScreenProps<T extends keyof CarWashStackParamList> =
  NativeStackScreenProps<CarWashStackParamList, T>;

export type CustomerAppScreenProps<T extends keyof CustomerAppParamList> =
  NativeStackScreenProps<CustomerAppParamList, T>;

export type ProviderAppScreenProps<T extends keyof ProviderAppParamList> =
  NativeStackScreenProps<ProviderAppParamList, T>;

export type CustomerOnboardingStackScreenProps<
  T extends keyof CustomerOnboardingStackParamList,
> = NativeStackScreenProps<CustomerOnboardingStackParamList, T>;

export type MarketplaceOnboardingStackScreenProps<
  T extends keyof MarketplaceOnboardingStackParamList,
> = NativeStackScreenProps<MarketplaceOnboardingStackParamList, T>;

export type ProviderOnboardingStackScreenProps<
  T extends keyof ProviderOnboardingStackParamList,
> = NativeStackScreenProps<ProviderOnboardingStackParamList, T>;

export type ProviderDashboardStackScreenProps<
  T extends keyof ProviderDashboardStackParamList,
> = NativeStackScreenProps<ProviderDashboardStackParamList, T>;

export type ProviderRequestsAndQuotesStackScreenProps<
  T extends keyof ProviderRequestsAndQuotesStackParamList,
> = NativeStackScreenProps<ProviderRequestsAndQuotesStackParamList, T>;

export type ProviderWorkOrdersStackScreenProps<
  T extends keyof ProviderWorkOrdersStackParamList,
> = NativeStackScreenProps<ProviderWorkOrdersStackParamList, T>;

export type ProviderProfileStackScreenProps<
  T extends keyof ProviderProfileStackParamList,
> = NativeStackScreenProps<ProviderProfileStackParamList, T>;

export type ProviderMessagesStackScreenProps<
  T extends keyof ProviderMessagesStackParamList,
> = NativeStackScreenProps<ProviderMessagesStackParamList, T>;

export type RequestsAndQuotesMainScreenProps =
  NativeStackScreenProps<
    ProviderRequestsAndQuotesStackParamList,
    "RequestsAndQuotesMain"
  >;

export type SupportChatScreenProps = {
  navigation: NavigationProp<ParamListBase>;
  route: RouteProp<
    { SupportChat: SupportChatParams | undefined },
    "SupportChat"
  >;
};

export type CustomerVehiclesListScreenProps =
  | NativeStackScreenProps<VehiclesStackParamList, "VehiclesList">
  | NativeStackScreenProps<ProfileStackParamList, "MyVehicles">;

