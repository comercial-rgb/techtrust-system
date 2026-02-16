/**
 * CarWashProfileScreen — Full car wash detail view
 * Shows all sections: photos, actions, packages, memberships,
 * add-ons, amenities, hours, payment methods, location, reviews
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Image,
  Linking, Platform, Share, FlatList, ActivityIndicator, StatusBar, Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import carWashService from '../services/carWash.service';
import { CarWashProfile } from '../types/carWash';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CAR_WASH_TYPE_LABELS: Record<string, string> = {
  AUTOMATIC_TUNNEL: 'Automatic Tunnel',
  EXPRESS_EXTERIOR: 'Express Exterior',
  SELF_SERVICE_BAY: 'Self-Service Bay',
  FULL_SERVICE: 'Full Service',
  HAND_WASH: 'Hand Wash',
};

const AMENITY_ICONS: Record<string, string> = {
  free_vacuum: 'vacuum',
  free_mat_cleaner: 'broom',
  free_towels: 'hand-wash-outline',
  free_tire_air: 'tire',
  vending_machines: 'storefront-outline',
  waiting_lounge: 'sofa-outline',
  wifi: 'wifi',
  restroom: 'man-outline',
  loyalty_program: 'ribbon-outline',
};

export default function CarWashProfileScreen({ route, navigation }: any) {
  const { t } = useI18n();
  const { carWashId } = route.params;
  const [profile, setProfile] = useState<CarWashProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    loadProfile();
  }, [carWashId]);

  const loadProfile = async () => {
    try {
      const data = await carWashService.getProfile(carWashId);
      setProfile(data);
      setIsFavorited(data.isFavorited);
    } catch (error) {
      console.error('Error loading car wash profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    try {
      const result = await carWashService.toggleFavorite(carWashId);
      setIsFavorited(result.isFavorited);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleGetDirections = async () => {
    if (!profile) return;
    carWashService.trackAction(carWashId, 'direction');

    const lat = Number(profile.latitude);
    const lng = Number(profile.longitude);
    const label = encodeURIComponent(profile.businessName);

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });

    if (url) {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        Linking.openURL(url);
      } else {
        // Fallback to Google Maps web
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${label}`);
      }
    }
  };

  const handleCall = () => {
    if (!profile?.phoneNumber) return;
    carWashService.trackAction(carWashId, 'phone');
    Linking.openURL(`tel:${profile.phoneNumber}`);
  };

  const handleWebsite = () => {
    if (!profile?.websiteUrl) return;
    carWashService.trackAction(carWashId, 'website');
    Linking.openURL(profile.websiteUrl);
  };

  const handleShare = async () => {
    if (!profile) return;
    try {
      await Share.share({
        title: profile.businessName,
        message: `Check out ${profile.businessName} on TechTrust!\n${profile.address}, ${profile.city}, ${profile.state} ${profile.zipCode}`,
      });
    } catch (error) {
      // ignore
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <MaterialCommunityIcons name="car-wash" size={64} color={colors.gray300} />
        <Text style={{ color: colors.textSecondary, marginTop: spacing.md }}>Car wash not found</Text>
      </SafeAreaView>
    );
  }

  const today = new Date().getDay();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* === SECTION 1: HEADER / PHOTOS === */}
        <View style={styles.photoSection}>
          {profile.photos.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setPhotoIndex(idx);
                }}
              >
                {profile.photos.map((photo, i) => (
                  <Image
                    key={photo.id}
                    source={{ uri: photo.imageUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {/* Dots */}
              {profile.photos.length > 1 && (
                <View style={styles.photoDots}>
                  {profile.photos.map((_, i) => (
                    <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.logoPlaceholder}>
              {profile.logoUrl ? (
                <Image source={{ uri: profile.logoUrl }} style={styles.logoImg} resizeMode="contain" />
              ) : (
                <MaterialCommunityIcons name="car-wash" size={64} color={colors.primary} />
              )}
            </View>
          )}

          {/* Overlay buttons */}
          <TouchableOpacity style={styles.backOverlay} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heartOverlay} onPress={handleFavorite}>
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorited ? '#ef4444' : '#fff'}
            />
          </TouchableOpacity>
        </View>

        {/* Name + Type + Rating + Status */}
        <View style={styles.infoSection}>
          <Text style={styles.businessName}>{profile.businessName}</Text>
          <View style={styles.typesRow}>
            {(profile.carWashTypes as string[]).map((type, i) => (
              <View key={i} style={styles.typeChip}>
                <Text style={styles.typeChipText}>{CAR_WASH_TYPE_LABELS[type] || type}</Text>
              </View>
            ))}
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color="#f59e0b" />
            <Text style={styles.ratingText}>{Number(profile.averageRating).toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({profile.totalReviews} reviews)</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, {
                backgroundColor: profile.isOpenNow ? colors.success : colors.error
              }]} />
              <Text style={[styles.statusText, {
                color: profile.isOpenNow ? colors.success : colors.error
              }]}>
                {profile.isOpenNow ? 'Open Now' : 'Closed'}
                {profile.closesAt ? ` · Closes at ${formatTime(profile.closesAt)}` : ''}
              </Text>
            </View>
          </View>
          {profile.isEcoFriendly && (
            <View style={styles.ecoRow}>
              <Ionicons name="leaf" size={14} color="#16a34a" />
              <Text style={styles.ecoText}>Eco-Friendly · Water Recycling</Text>
            </View>
          )}
        </View>

        {/* === SECTION 2: QUICK ACTIONS === */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleGetDirections}>
            <View style={[styles.actionIcon, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="navigate" size={20} color="#0284c7" />
            </View>
            <Text style={styles.actionLabel}>Directions</Text>
          </TouchableOpacity>
          {profile.phoneNumber && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
              <View style={[styles.actionIcon, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="call" size={20} color="#16a34a" />
              </View>
              <Text style={styles.actionLabel}>Call</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="share-social" size={20} color="#d97706" />
            </View>
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
          {profile.websiteUrl && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleWebsite}>
              <View style={[styles.actionIcon, { backgroundColor: '#ede9fe' }]}>
                <Ionicons name="globe" size={20} color="#7c3aed" />
              </View>
              <Text style={styles.actionLabel}>Website</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* === SECTION 3: WASH PACKAGES === */}
        {profile.packages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="water" size={18} color={colors.primary} />
              {'  '}Wash Packages
            </Text>
            {profile.packages.map((pkg) => (
              <View
                key={pkg.id}
                style={[styles.packageCard, pkg.isMostPopular && styles.popularPackage]}
              >
                {pkg.isMostPopular && (
                  <View style={styles.popularBadge}>
                    <Ionicons name="star" size={10} color="#fff" />
                    <Text style={styles.popularBadgeText}>Most Popular</Text>
                  </View>
                )}
                <View style={styles.packageHeader}>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <View style={styles.packagePricing}>
                    <Text style={styles.packagePrice}>${Number(pkg.priceBase).toFixed(0)}</Text>
                    {pkg.priceSUV && (
                      <Text style={styles.suvPrice}>
                        +${(Number(pkg.priceSUV) - Number(pkg.priceBase)).toFixed(0)} SUV/Truck
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.packageServices}>
                  {pkg.services.map((ps) => (
                    <View key={ps.id} style={styles.serviceRow}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={styles.serviceName}>{ps.service.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* === SECTION 4: MEMBERSHIP / UNLIMITED PLANS === */}
        {profile.membershipPlans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="infinite" size={18} color="#8b5cf6" />
              {'  '}Unlimited Plans
            </Text>
            {profile.membershipPlans.map((plan) => (
              <View key={plan.id} style={styles.membershipCard}>
                <View style={styles.membershipHeader}>
                  <Text style={styles.membershipName}>{plan.name}</Text>
                  <Text style={styles.membershipPrice}>
                    ${Number(plan.monthlyPrice).toFixed(2)}/mo
                  </Text>
                </View>
                <Text style={styles.membershipLevel}>
                  Includes: {plan.packageLevel} level wash
                </Text>
                {plan.multiLocation && (
                  <View style={styles.multiLocRow}>
                    <Ionicons name="location" size={12} color="#8b5cf6" />
                    <Text style={styles.multiLocText}>Valid at all locations</Text>
                  </View>
                )}
                {plan.description && (
                  <Text style={styles.membershipDesc}>{plan.description}</Text>
                )}
              </View>
            ))}
            <Text style={styles.membershipNote}>
              * Membership sign-up available at the car wash location or their website
            </Text>
          </View>
        )}

        {/* === SECTION 5: ADD-ON SERVICES === */}
        {profile.addOnServices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="add-circle" size={18} color={colors.primary} />
              {'  '}Add-On Services
            </Text>
            {profile.addOnServices.map((addon) => (
              <View key={addon.id} style={styles.addOnRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addOnName}>{addon.name}</Text>
                  {addon.description && (
                    <Text style={styles.addOnDesc}>{addon.description}</Text>
                  )}
                </View>
                <Text style={styles.addOnPrice}>${Number(addon.price).toFixed(0)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* === SECTION 6: FREE AMENITIES === */}
        {profile.amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="gift" size={18} color="#10b981" />
              {'  '}Free Amenities
            </Text>
            <View style={styles.amenitiesGrid}>
              {profile.amenities.map((am) => (
                <View key={am.id} style={styles.amenityItem}>
                  <View style={styles.amenityIconBg}>
                    <Ionicons
                      name={(AMENITY_ICONS[am.amenity.key] || 'checkmark') as any}
                      size={18}
                      color="#10b981"
                    />
                  </View>
                  <Text style={styles.amenityName}>{am.amenity.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* === SECTION 7: HOURS OF OPERATION === */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="time" size={18} color={colors.primary} />
            {'  '}Hours of Operation
          </Text>
          {profile.operatingHours.map((hours) => (
            <View
              key={hours.id}
              style={[styles.hoursRow, hours.dayOfWeek === today && styles.hoursRowToday]}
            >
              <Text style={[styles.dayName, hours.dayOfWeek === today && styles.dayNameToday]}>
                {DAY_NAMES[hours.dayOfWeek]}
              </Text>
              <Text style={[styles.dayHours, hours.dayOfWeek === today && styles.dayHoursToday]}>
                {hours.isClosed
                  ? 'Closed'
                  : hours.is24Hours
                    ? '24 Hours'
                    : `${formatTime(hours.openTime || '')} — ${formatTime(hours.closeTime || '')}`
                }
              </Text>
            </View>
          ))}
        </View>

        {/* === SECTION 8: PAYMENT METHODS === */}
        {profile.paymentMethods.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="card" size={18} color={colors.primary} />
              {'  '}Payment Methods
            </Text>
            <View style={styles.paymentGrid}>
              {profile.paymentMethods.map((pm) => (
                <View key={pm.id} style={styles.paymentChip}>
                  <Text style={styles.paymentText}>{pm.paymentMethod.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* === SECTION 9: LOCATION DETAILS === */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="location" size={18} color={colors.primary} />
            {'  '}Location
          </Text>
          <Text style={styles.addressText}>
            {profile.address}
            {profile.addressLine2 ? `, ${profile.addressLine2}` : ''}
          </Text>
          <Text style={styles.addressText}>
            {profile.city}, {profile.state} {profile.zipCode}
          </Text>
          {profile.accessInstructions && (
            <Text style={styles.accessText}>
              <Ionicons name="information-circle" size={12} color={colors.textSecondary} />
              {' '}{profile.accessInstructions}
            </Text>
          )}
          <View style={styles.facilityDetails}>
            {profile.numberOfTunnels > 0 && (
              <Text style={styles.facilityText}>
                {profile.numberOfTunnels} tunnel{profile.numberOfTunnels > 1 ? 's' : ''}
              </Text>
            )}
            {profile.numberOfBays > 0 && (
              <Text style={styles.facilityText}>
                {profile.numberOfBays} bay{profile.numberOfBays > 1 ? 's' : ''}
              </Text>
            )}
            {profile.maxVehicleHeight && (
              <Text style={styles.facilityText}>
                Max height: {Number(profile.maxVehicleHeight)}ft
              </Text>
            )}
            {!profile.acceptsLargeVehicles && (
              <Text style={[styles.facilityText, { color: colors.error }]}>
                No trucks/large vehicles
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.directionsBtn} onPress={handleGetDirections}>
            <Ionicons name="navigate" size={18} color={colors.white} />
            <Text style={styles.directionsBtnText}>Get Directions</Text>
          </TouchableOpacity>
        </View>

        {/* === SECTION 10: REVIEWS === */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="star" size={18} color="#f59e0b" />
              {'  '}Reviews
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('CarWashReview', { carWashId, businessName: profile.businessName })}
            >
              <Text style={styles.writeReviewLink}>Write Review</Text>
            </TouchableOpacity>
          </View>

          {/* Rating Summary */}
          <View style={styles.ratingSummary}>
            <View style={styles.ratingBig}>
              <Text style={styles.ratingBigNumber}>
                {Number(profile.averageRating).toFixed(1)}
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <Ionicons
                    key={s}
                    name={s <= Math.round(Number(profile.averageRating)) ? 'star' : 'star-outline'}
                    size={14}
                    color="#f59e0b"
                  />
                ))}
              </View>
              <Text style={styles.totalReviewsText}>{profile.totalReviews} reviews</Text>
            </View>
            <View style={styles.ratingBars}>
              {[5, 4, 3, 2, 1].map(star => {
                const count = profile.ratingDistribution[star] || 0;
                const pct = profile.totalReviews > 0 ? (count / profile.totalReviews) * 100 : 0;
                return (
                  <View key={star} style={styles.ratingBarRow}>
                    <Text style={styles.ratingBarLabel}>{star}</Text>
                    <View style={styles.ratingBarBg}>
                      <View style={[styles.ratingBarFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.ratingBarCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Reviews List */}
          {profile.reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewUser}>
                  {review.user.avatarUrl ? (
                    <Image source={{ uri: review.user.avatarUrl }} style={styles.reviewAvatar} />
                  ) : (
                    <View style={[styles.reviewAvatar, styles.reviewAvatarPlaceholder]}>
                      <Text style={styles.reviewAvatarText}>
                        {review.user.fullName.charAt(0)}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.reviewUserName}>{review.user.fullName}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Ionicons
                      key={s}
                      name={s <= review.rating ? 'star' : 'star-outline'}
                      size={12}
                      color="#f59e0b"
                    />
                  ))}
                </View>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
              {review.response && (
                <View style={styles.reviewResponse}>
                  <Text style={styles.responseLabel}>Owner Response:</Text>
                  <Text style={styles.responseText}>{review.response}</Text>
                </View>
              )}
            </View>
          ))}

          {profile.totalReviews > 10 && (
            <TouchableOpacity
              style={styles.seeAllReviewsBtn}
              onPress={() => navigation.navigate('CarWashAllReviews', { carWashId })}
            >
              <Text style={styles.seeAllReviewsText}>See All {profile.totalReviews} Reviews</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* === SECTION 11: DETAILING REDIRECT === */}
        <View style={styles.detailingBanner}>
          <View style={styles.detailingContent}>
            <MaterialCommunityIcons name="auto-fix" size={28} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.detailingTitle}>Looking for Professional Detailing?</Text>
              <Text style={styles.detailingDesc}>
                Paint correction, ceramic coating, interior deep clean, and more — request through our Services section.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.detailingBtn}
            onPress={() => {
              navigation.navigate('Dashboard', {
                screen: 'ServiceChoice',
              });
            }}
          >
            <Text style={styles.detailingBtnText}>Request Detailing Service</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  // Photos
  photoSection: { position: 'relative', height: 220 },
  photo: { width: SCREEN_WIDTH, height: 220 },
  photoDots: { flexDirection: 'row', position: 'absolute', bottom: 12, alignSelf: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 16 },
  logoPlaceholder: { height: 220, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  logoImg: { width: 120, height: 120 },
  backOverlay: { position: 'absolute', top: 8, left: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  heartOverlay: { position: 'absolute', top: 8, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  // Info
  infoSection: { padding: spacing.lg },
  businessName: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  typesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  typeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: colors.primaryLight },
  typeChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  ratingText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  reviewCount: { fontSize: fontSize.sm, color: colors.textSecondary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: spacing.md },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  ecoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  ecoText: { fontSize: fontSize.xs, color: '#16a34a', fontWeight: fontWeight.medium },
  // Actions
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderColor: colors.border },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.text },
  // Sections
  section: { padding: spacing.lg, borderTopWidth: 8, borderTopColor: colors.gray100 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  // Packages
  packageCard: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  popularPackage: { borderColor: colors.primary, borderWidth: 2 },
  popularBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: spacing.xs },
  popularBadgeText: { fontSize: 10, fontWeight: fontWeight.bold, color: '#fff' },
  packageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  packageName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, flex: 1 },
  packagePricing: { alignItems: 'flex-end' },
  packagePrice: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
  suvPrice: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  packageServices: { marginTop: spacing.sm, gap: 4 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceName: { fontSize: fontSize.sm, color: colors.text },
  // Memberships
  membershipCard: { backgroundColor: '#f5f3ff', borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: '#ddd6fe' },
  membershipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  membershipName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: '#5b21b6' },
  membershipPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: '#7c3aed' },
  membershipLevel: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  multiLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  multiLocText: { fontSize: fontSize.xs, color: '#8b5cf6', fontWeight: fontWeight.medium },
  membershipDesc: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4 },
  membershipNote: { fontSize: fontSize.xs, color: colors.textLight, fontStyle: 'italic', marginTop: spacing.xs },
  // Add-ons
  addOnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  addOnName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  addOnDesc: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  addOnPrice: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary, marginLeft: spacing.sm },
  // Amenities
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  amenityItem: { alignItems: 'center', width: 80 },
  amenityIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  amenityName: { fontSize: 10, color: colors.text, textAlign: 'center', marginTop: 4, fontWeight: fontWeight.medium },
  // Hours
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: 4 },
  hoursRowToday: { backgroundColor: colors.primaryLight },
  dayName: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium, width: 100 },
  dayNameToday: { fontWeight: fontWeight.bold, color: colors.primary },
  dayHours: { fontSize: fontSize.sm, color: colors.textSecondary },
  dayHoursToday: { fontWeight: fontWeight.bold, color: colors.primary },
  // Payment
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paymentChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.sm, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  paymentText: { fontSize: fontSize.xs, color: colors.text, fontWeight: fontWeight.medium },
  // Location
  addressText: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  accessText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs, fontStyle: 'italic' },
  facilityDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  facilityText: { fontSize: fontSize.xs, color: colors.textSecondary, backgroundColor: colors.gray100, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  directionsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.md, marginTop: spacing.lg },
  directionsBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.white },
  // Reviews
  writeReviewLink: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  ratingSummary: { flexDirection: 'row', marginBottom: spacing.lg, gap: spacing.lg },
  ratingBig: { alignItems: 'center', justifyContent: 'center' },
  ratingBigNumber: { fontSize: 36, fontWeight: fontWeight.bold, color: colors.text },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 4 },
  totalReviewsText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  ratingBars: { flex: 1, justifyContent: 'center', gap: 4 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingBarLabel: { fontSize: fontSize.xs, color: colors.textSecondary, width: 12, textAlign: 'right' },
  ratingBarBg: { flex: 1, height: 8, backgroundColor: colors.gray100, borderRadius: 4 },
  ratingBarFill: { height: 8, backgroundColor: '#f59e0b', borderRadius: 4 },
  ratingBarCount: { fontSize: fontSize.xs, color: colors.textSecondary, width: 24 },
  reviewCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewUser: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16 },
  reviewAvatarPlaceholder: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },
  reviewUserName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  reviewDate: { fontSize: fontSize.xs, color: colors.textSecondary },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewComment: { fontSize: fontSize.sm, color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
  reviewResponse: { backgroundColor: colors.gray50, borderRadius: borderRadius.sm, padding: spacing.sm, marginTop: spacing.sm },
  responseLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.text },
  responseText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  seeAllReviewsBtn: { alignItems: 'center', paddingVertical: spacing.md },
  seeAllReviewsText: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.semibold },
  // Detailing Banner
  detailingBanner: { margin: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.primaryLight, padding: spacing.lg, borderWidth: 1, borderColor: colors.primary + '30' },
  detailingContent: { flexDirection: 'row', alignItems: 'flex-start' },
  detailingTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
  detailingDesc: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  detailingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.md },
  detailingBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
});
