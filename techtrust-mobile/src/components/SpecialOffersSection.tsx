/**
 * SpecialOffersSection - Componente reutilizável de Ofertas Especiais
 * Usado na LandingScreen e CustomerDashboard
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export interface SpecialOffer {
  id: string;
  title: string;
  description?: string;
  discount?: number | string;
  imageUrl?: string;
  image?: string; // Legacy support
  code?: string;
  originalPrice?: string;
  discountedPrice?: string;
  regularPrice?: number;
  specialPrice?: number;
  validUntil?: string;
}

interface SpecialOffersSectionProps {
  offers: SpecialOffer[];
  onOfferPress?: (offer: SpecialOffer) => void;
  showHeader?: boolean;
  compact?: boolean;
  loading?: boolean;
}

export default function SpecialOffersSection({ 
  offers,
  onOfferPress, 
  showHeader = true,
  compact = false,
  loading = false,
}: SpecialOffersSectionProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (offerId: string) => {
    setImageErrors(prev => ({ ...prev, [offerId]: true }));
  };

  // Gerar cores baseadas no índice
  const getOfferColors = (index: number) => {
    const colors = [
      { bgColor: '#fee2e2', accentColor: '#ef4444' },
      { bgColor: '#fef3c7', accentColor: '#f59e0b' },
      { bgColor: '#d1fae5', accentColor: '#10b981' },
      { bgColor: '#dbeafe', accentColor: '#3b82f6' },
    ];
    return colors[index % colors.length];
  };
  
  const renderOffer = ({ item, index }: { item: SpecialOffer; index: number }) => {
    const hasError = imageErrors[item.id];
    const colors = getOfferColors(index);
    
    // Support both imageUrl and image fields
    const rawImageUrl = item.imageUrl || item.image;
    
    // Ensure imageUrl is absolute
    const imageUrl = rawImageUrl?.startsWith('http') 
      ? rawImageUrl 
      : rawImageUrl 
        ? `${process.env.EXPO_PUBLIC_API_URL || 'https://techtrust-api.onrender.com'}${rawImageUrl.startsWith('/') ? rawImageUrl : '/' + rawImageUrl}`
        : null;
    
    // Format discount display
    const discountDisplay = typeof item.discount === 'number' 
      ? `${item.discount}% OFF` 
      : item.discount;
    
    // Get prices
    const regularPrice = item.originalPrice || (item.regularPrice ? `$${item.regularPrice.toFixed(2)}` : null);
    const specialPrice = item.discountedPrice || (item.specialPrice ? `$${item.specialPrice.toFixed(2)}` : null);
    
    return (
      <TouchableOpacity 
        style={[styles.offerCard, compact && styles.offerCardCompact]}
        activeOpacity={0.9}
        onPress={() => onOfferPress?.(item)}
      >
        {imageUrl && !hasError ? (
          <Image 
            source={{ uri: imageUrl }} 
            style={[styles.offerImage, compact && styles.offerImageCompact]} 
            onError={() => handleImageError(item.id)}
          />
        ) : (
          <View style={[styles.offerImage, compact && styles.offerImageCompact, { backgroundColor: colors.bgColor }]}>
            <MaterialCommunityIcons name="tag-outline" size={40} color={colors.accentColor} />
          </View>
        )}
        
        {discountDisplay && (
          <View style={[styles.discountBadge, { backgroundColor: colors.accentColor }]}>
            <Text style={styles.discountText}>{discountDisplay}</Text>
          </View>
        )}
        
        <View style={styles.offerContent}>
          <Text style={styles.offerTitle} numberOfLines={1}>{item.title}</Text>
          {item.description && (
            <Text style={styles.offerDescription} numberOfLines={compact ? 1 : 2}>
              {item.description}
            </Text>
          )}
          {/* Price display */}
          {(regularPrice || specialPrice) && (
            <View style={styles.priceContainer}>
              {regularPrice && (
                <Text style={styles.regularPrice}>{regularPrice}</Text>
              )}
              {specialPrice && (
                <Text style={[styles.specialPrice, { color: colors.accentColor }]}>{specialPrice}</Text>
              )}
            </View>
          )}
          {/* Valid Until */}
          {item.validUntil && (
            <Text style={styles.validUntil}>Valid until {item.validUntil}</Text>
          )}
          {item.code && (
            <View style={[styles.codeContainer, { backgroundColor: colors.bgColor }]}>
              <Text style={[styles.codeText, { color: colors.accentColor }]}>
                Code: {item.code}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {showHeader && (
          <View style={styles.header}>
            <MaterialCommunityIcons name="tag-multiple" size={24} color="#ef4444" />
            <View style={styles.headerText}>
              <Text style={styles.title}>Special Offers</Text>
              <Text style={styles.subtitle}>Limited time deals</Text>
            </View>
          </View>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </View>
    );
  }

  if (offers.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <MaterialCommunityIcons name="tag-multiple" size={24} color="#ef4444" />
          <View style={styles.headerText}>
            <Text style={styles.title}>Special Offers</Text>
            <Text style={styles.subtitle}>Limited time deals</Text>
          </View>
          {offers.length > 3 && (
            <TouchableOpacity style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <FlatList
        data={offers}
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
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
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
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  regularPrice: {
    fontSize: 13,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  specialPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  validUntil: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 6,
  },
  codeContainer: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
