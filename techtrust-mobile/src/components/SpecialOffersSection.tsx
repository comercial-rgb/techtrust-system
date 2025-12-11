/**
 * SpecialOffersSection - Componente reutilizável de Ofertas Especiais
 * Usado na LandingScreen e CustomerDashboard
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Mock data para ofertas especiais
const SPECIAL_OFFERS = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    title: 'Oil Change Special',
    discount: '15% OFF',
    description: 'Full synthetic oil change with filter',
    validUntil: 'Dec 31, 2025',
    originalPrice: '$89.99',
    discountedPrice: '$76.49',
    bgColor: '#fee2e2',
    accentColor: '#ef4444',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
    title: 'Brake Service',
    discount: '20% OFF',
    description: 'Front or rear brake pad replacement',
    validUntil: 'Dec 25, 2025',
    originalPrice: '$199.99',
    discountedPrice: '$159.99',
    bgColor: '#fef3c7',
    accentColor: '#f59e0b',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400',
    title: 'A/C Check',
    discount: 'FREE',
    description: 'Complete A/C system inspection',
    validUntil: 'Dec 20, 2025',
    originalPrice: '$49.99',
    discountedPrice: 'FREE',
    bgColor: '#d1fae5',
    accentColor: '#10b981',
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400',
    title: 'Tire Rotation',
    discount: '$19.99',
    description: 'All 4 tires rotated & balanced',
    validUntil: 'Dec 28, 2025',
    originalPrice: '$39.99',
    discountedPrice: '$19.99',
    bgColor: '#dbeafe',
    accentColor: '#1976d2',
  },
];

interface SpecialOffersSectionProps {
  onOfferPress?: (offerId: string) => void;
  showHeader?: boolean;
  compact?: boolean;
}

export default function SpecialOffersSection({ 
  onOfferPress, 
  showHeader = true,
  compact = false 
}: SpecialOffersSectionProps) {
  
  const renderOffer = ({ item }: { item: typeof SPECIAL_OFFERS[0] }) => (
    <TouchableOpacity 
      style={[styles.offerCard, compact && styles.offerCardCompact]}
      activeOpacity={0.9}
      onPress={() => onOfferPress?.(item.id)}
    >
      <Image source={{ uri: item.image }} style={[styles.offerImage, compact && styles.offerImageCompact]} />
      <View style={[styles.discountBadge, { backgroundColor: item.accentColor }]}>
        <Text style={styles.discountText}>{item.discount}</Text>
      </View>
      <View style={styles.offerContent}>
        <Text style={styles.offerTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.offerDescription} numberOfLines={compact ? 1 : 2}>{item.description}</Text>
        <View style={styles.offerPricing}>
          <Text style={styles.originalPrice}>{item.originalPrice}</Text>
          <Text style={[styles.discountedPrice, { color: item.accentColor }]}>{item.discountedPrice}</Text>
        </View>
        {!compact && (
          <Text style={styles.validUntil}>Valid until {item.validUntil}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <MaterialCommunityIcons name="tag-multiple" size={24} color="#ef4444" />
          <View style={styles.headerText}>
            <Text style={styles.title}>Special Offers</Text>
            <Text style={styles.subtitle}>Limited time deals</Text>
          </View>
          <TouchableOpacity style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={SPECIAL_OFFERS}
        renderItem={renderOffer}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  viewAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  listContainer: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  offerCard: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  offerCardCompact: {
    width: 180,
  },
  offerImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  offerImageCompact: {
    height: 90,
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  offerContent: {
    padding: 14,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  offerDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 18,
  },
  offerPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  originalPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  validUntil: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 8,
  },
});
