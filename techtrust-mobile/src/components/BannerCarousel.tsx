/**
 * BannerCarousel - Carousel de banners com auto-play
 * Exibe banners gerenciados pelo admin
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 180;
const AUTO_PLAY_INTERVAL = 5000; // 5 seconds

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  linkType?: string;
}

interface BannerCarouselProps {
  banners: Banner[];
  autoPlay?: boolean;
}

export default function BannerCarousel({ banners, autoPlay = true }: BannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Auto-play logic
  useEffect(() => {
    if (!autoPlay || banners.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % banners.length;
      setActiveIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, AUTO_PLAY_INTERVAL);

    return () => clearInterval(interval);
  }, [activeIndex, banners.length, autoPlay]);

  const handleBannerPress = async (banner: Banner) => {
    if (!banner.linkUrl) return;

    try {
      const canOpen = await Linking.canOpenURL(banner.linkUrl);
      if (canOpen) {
        await Linking.openURL(banner.linkUrl);
      }
    } catch (error) {
      console.error('Error opening banner link:', error);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleImageError = (bannerId: string) => {
    setImageErrors(prev => ({ ...prev, [bannerId]: true }));
  };

  const renderBanner = ({ item }: { item: Banner }) => {
    const hasError = imageErrors[item.id];
    
    // Ensure imageUrl is absolute (add API base URL if it's relative)
    let imageUrl = item.imageUrl || '';
    if (imageUrl && !imageUrl.startsWith('http')) {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://techtrust-api.onrender.com';
      imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
    }
    
    console.log('BannerCarousel rendering banner:', item.id, 'URL:', imageUrl);
    
    return (
      <TouchableOpacity
        style={styles.bannerContainer}
        activeOpacity={item.linkUrl ? 0.8 : 1}
        onPress={() => handleBannerPress(item)}
      >
        {!hasError && imageUrl ? (
          <Image
            source={{ 
              uri: imageUrl,
              cache: 'force-cache',
            }}
            style={styles.bannerImage}
            resizeMode="cover"
            onError={() => {
              console.log('BannerCarousel image error for:', imageUrl);
              handleImageError(item.id);
            }}
            onLoad={() => console.log('BannerCarousel image loaded:', imageUrl)}
          />
        ) : (
          <View style={[styles.bannerImage, styles.errorPlaceholder]}>
            <ActivityIndicator size="small" color="#9ca3af" />
            <Text style={styles.errorText}>Image not available</Text>
          </View>
        )}
        
        {/* Gradient overlay for better text readability */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        >
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.subtitle && (
              <Text style={styles.bannerSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={banners}
        renderItem={renderBanner}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH - 32,
          offset: (SCREEN_WIDTH - 32) * index,
          index,
        })}
      />

      {/* Pagination dots */}
      {banners.length > 1 && (
        <View style={styles.pagination}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  bannerContainer: {
    width: SCREEN_WIDTH - 32,
    height: BANNER_HEIGHT,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  errorPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  bannerContent: {
    gap: 4,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#3b82f6',
  },
});
