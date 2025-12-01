/**
 * Skeleton Components - Loading placeholders elegantes
 * TechTrust Mobile
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// ============================================
// Skeleton Base Component
// ============================================

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({
  width: w = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: w,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ============================================
// Card Skeleton
// ============================================

export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={styles.cardHeaderText}>
          <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <Skeleton width="100%" height={14} style={{ marginTop: 16 }} />
      <Skeleton width="80%" height={14} style={{ marginTop: 8 }} />
      <Skeleton width="50%" height={14} style={{ marginTop: 8 }} />
    </View>
  );
}

// ============================================
// List Item Skeleton
// ============================================

export function ListItemSkeleton() {
  return (
    <View style={styles.listItem}>
      <Skeleton width={56} height={56} borderRadius={12} />
      <View style={styles.listItemContent}>
        <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={12} style={{ marginBottom: 6 }} />
        <Skeleton width="30%" height={12} />
      </View>
      <Skeleton width={24} height={24} borderRadius={12} />
    </View>
  );
}

// ============================================
// Profile Skeleton
// ============================================

export function ProfileSkeleton() {
  return (
    <View style={styles.profile}>
      <Skeleton width={100} height={100} borderRadius={50} style={{ alignSelf: 'center' }} />
      <Skeleton width="50%" height={20} style={{ alignSelf: 'center', marginTop: 16 }} />
      <Skeleton width="35%" height={14} style={{ alignSelf: 'center', marginTop: 8 }} />
      
      <View style={styles.profileStats}>
        <View style={styles.statItem}>
          <Skeleton width={40} height={24} style={{ alignSelf: 'center' }} />
          <Skeleton width={60} height={12} style={{ alignSelf: 'center', marginTop: 4 }} />
        </View>
        <View style={styles.statItem}>
          <Skeleton width={40} height={24} style={{ alignSelf: 'center' }} />
          <Skeleton width={60} height={12} style={{ alignSelf: 'center', marginTop: 4 }} />
        </View>
        <View style={styles.statItem}>
          <Skeleton width={40} height={24} style={{ alignSelf: 'center' }} />
          <Skeleton width={60} height={12} style={{ alignSelf: 'center', marginTop: 4 }} />
        </View>
      </View>
    </View>
  );
}

// ============================================
// Vehicle Card Skeleton
// ============================================

export function VehicleSkeleton() {
  return (
    <View style={{ marginBottom: 16 }}>
      <Skeleton width="100%" height={180} style={{ borderRadius: 16 }} />
    </View>
  );
}

export function VehicleCardSkeleton() {
  return (
    <View style={styles.vehicleCard}>
      <Skeleton width="100%" height={140} borderRadius={12} />
      <View style={styles.vehicleInfo}>
        <Skeleton width="60%" height={18} style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height={14} style={{ marginBottom: 12 }} />
        <View style={styles.vehicleTags}>
          <Skeleton width={70} height={24} borderRadius={12} />
          <Skeleton width={50} height={24} borderRadius={12} style={{ marginLeft: 8 }} />
        </View>
      </View>
    </View>
  );
}

// ============================================
// Work Order Skeleton
// ============================================

export function WorkOrderSkeleton() {
  return (
    <View style={styles.workOrder}>
      <View style={styles.workOrderHeader}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Skeleton width="50%" height={16} style={{ marginBottom: 6 }} />
          <Skeleton width="70%" height={12} />
        </View>
        <Skeleton width={80} height={28} borderRadius={14} />
      </View>
      <View style={styles.workOrderDivider} />
      <View style={styles.workOrderDetails}>
        <View style={styles.workOrderDetailItem}>
          <Skeleton width={20} height={20} borderRadius={10} />
          <Skeleton width={100} height={14} style={{ marginLeft: 8 }} />
        </View>
        <View style={styles.workOrderDetailItem}>
          <Skeleton width={20} height={20} borderRadius={10} />
          <Skeleton width={80} height={14} style={{ marginLeft: 8 }} />
        </View>
      </View>
      <Skeleton width="100%" height={44} borderRadius={10} style={{ marginTop: 16 }} />
    </View>
  );
}

// ============================================
// Dashboard Stats Skeleton
// ============================================

export function DashboardStatsSkeleton() {
  return (
    <View style={styles.dashboardStats}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={styles.statCard}>
          <Skeleton width={40} height={40} borderRadius={12} />
          <Skeleton width={50} height={28} style={{ marginTop: 12 }} />
          <Skeleton width={70} height={12} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

// ============================================
// Full Screen Loading
// ============================================

interface FullScreenLoadingProps {
  type?: 'cards' | 'list' | 'profile' | 'dashboard';
  count?: number;
}

export function FullScreenLoading({ type = 'cards', count = 3 }: FullScreenLoadingProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'list':
        return <ListItemSkeleton />;
      case 'profile':
        return <ProfileSkeleton />;
      case 'dashboard':
        return <DashboardStatsSkeleton />;
      default:
        return <CardSkeleton />;
    }
  };

  if (type === 'profile' || type === 'dashboard') {
    return <View style={styles.fullScreen}>{renderSkeleton()}</View>;
  }

  return (
    <View style={styles.fullScreen}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={{ marginBottom: 16 }}>
          {renderSkeleton()}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e5e7eb',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  profile: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statItem: {
    alignItems: 'center',
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  vehicleInfo: {
    padding: 16,
  },
  vehicleTags: {
    flexDirection: 'row',
  },
  workOrder: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  workOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workOrderDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
  },
  workOrderDetails: {
    gap: 8,
  },
  workOrderDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dashboardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 48) / 2 - 6,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  fullScreen: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
});
