/**
 * ProviderWorkingHoursScreen - Horários de Funcionamento
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';

interface DaySchedule {
  day: string;
  dayShort: string;
  enabled: boolean;
  openTime: string;
  closeTime: string;
  hasLunchBreak: boolean;
  lunchStart?: string;
  lunchEnd?: string;
}

export default function ProviderWorkingHoursScreen({ navigation }: any) {
  const { t } = useI18n();
  const [schedule, setSchedule] = useState<DaySchedule[]>([
    { day: 'Monday', dayShort: 'Mon', enabled: true, openTime: '08:00', closeTime: '18:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
    { day: 'Tuesday', dayShort: 'Tue', enabled: true, openTime: '08:00', closeTime: '18:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
    { day: 'Wednesday', dayShort: 'Wed', enabled: true, openTime: '08:00', closeTime: '18:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
    { day: 'Thursday', dayShort: 'Thu', enabled: true, openTime: '08:00', closeTime: '18:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
    { day: 'Friday', dayShort: 'Fri', enabled: true, openTime: '08:00', closeTime: '18:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
    { day: 'Saturday', dayShort: 'Sat', enabled: true, openTime: '08:00', closeTime: '12:00', hasLunchBreak: false },
    { day: 'Sunday', dayShort: 'Sun', enabled: false, openTime: '09:00', closeTime: '13:00', hasLunchBreak: false },
  ]);

  const [is24Hours, setIs24Hours] = useState(false);

  const toggleDay = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].enabled = !newSchedule[index].enabled;
    setSchedule(newSchedule);
  };

  const timeOptions = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
    '20:00', '21:00', '22:00', '23:00', '00:00',
  ];

  const handleSave = () => {
    Alert.alert(t.common?.success || 'Success', t.provider?.hoursUpdated || 'Hours updated successfully!');
    navigation.goBack();
  };

  const workingDaysCount = schedule.filter(s => s.enabled).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.provider?.workingHours || 'Hours'}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveBtn}>{t.common?.save || 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons name="clock-outline" size={28} color="#2B5EA7" />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>
              {workingDaysCount} {t.provider?.workingDays || 'working days'}
            </Text>
            <Text style={styles.summarySubtitle}>
              {is24Hours ? (t.provider?.service24h || '24-hour service') : (t.provider?.businessHours || 'Business hours')}
            </Text>
          </View>
        </View>

        {/* 24 Hours Toggle */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleInfo}>
            <MaterialCommunityIcons name="hours-24" size={24} color="#6b7280" />
            <View style={styles.toggleText}>
              <Text style={styles.toggleTitle}>{t.provider?.service24h || '24-hour service'}</Text>
              <Text style={styles.toggleSubtitle}>{t.provider?.emergencyServices || 'For emergency services'}</Text>
            </View>
          </View>
          <Switch
            value={is24Hours}
            onValueChange={setIs24Hours}
            trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
            thumbColor={is24Hours ? '#2B5EA7' : '#9ca3af'}
          />
        </View>

        {/* Schedule */}
        <View style={styles.scheduleSection}>
          <Text style={styles.sectionTitle}>{t.provider?.scheduleByDay || 'Schedule by Day'}</Text>
          
          {schedule.map((day, index) => (
            <View key={day.day} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <TouchableOpacity 
                  style={styles.dayToggle}
                  onPress={() => toggleDay(index)}
                >
                  <View style={[
                    styles.dayCheckbox,
                    day.enabled && styles.dayCheckboxActive,
                  ]}>
                    {day.enabled && (
                      <MaterialCommunityIcons name="check" size={16} color="#fff" />
                    )}
                  </View>
                  <Text style={[
                    styles.dayName,
                    !day.enabled && styles.dayNameDisabled,
                  ]}>
                    {day.day}
                  </Text>
                </TouchableOpacity>

                {day.enabled && !is24Hours && (
                  <View style={styles.timeContainer}>
                    <TouchableOpacity style={styles.timeBox}>
                      <Text style={styles.timeText}>{day.openTime}</Text>
                    </TouchableOpacity>
                    <Text style={styles.timeSeparator}>{t.common?.to || 'to'}</Text>
                    <TouchableOpacity style={styles.timeBox}>
                      <Text style={styles.timeText}>{day.closeTime}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {day.enabled && is24Hours && (
                  <View style={styles.badge24h}>
                    <Text style={styles.badge24hText}>24h</Text>
                  </View>
                )}

                {!day.enabled && (
                  <Text style={styles.closedText}>{t.provider?.closed || 'Closed'}</Text>
                )}
              </View>

              {day.enabled && day.hasLunchBreak && !is24Hours && (
                <View style={styles.lunchBreak}>
                  <MaterialCommunityIcons name="silverware-fork-knife" size={16} color="#f59e0b" />
                  <Text style={styles.lunchText}>
                    {t.provider?.break || 'Break'}: {day.lunchStart} - {day.lunchEnd}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Holidays */}
        <View style={styles.holidaysSection}>
          <View style={styles.holidaysHeader}>
            <Text style={styles.sectionTitle}>{t.provider?.holidays || 'Holidays'}</Text>
            <TouchableOpacity>
              <Text style={styles.manageText}>{t.common?.manage || 'Manage'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.holidaysBanner}>
            <MaterialCommunityIcons name="calendar-star" size={24} color="#6b7280" />
            <Text style={styles.holidaysText}>
              {t.provider?.closedOnHolidays || 'Closed on national holidays'}
            </Text>
            <Switch
              value={true}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
              thumbColor="#2B5EA7"
            />
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            {t.provider?.hoursInfo || 'Your hours are shown to customers and affect when you receive new orders.'}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B5EA7',
    padding: 8,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e40af',
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#3b82f6',
    marginTop: 2,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  toggleInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  toggleSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  scheduleSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCheckboxActive: {
    backgroundColor: '#2B5EA7',
    borderColor: '#2B5EA7',
  },
  dayName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  dayNameDisabled: {
    color: '#9ca3af',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeBox: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  timeSeparator: {
    fontSize: 14,
    color: '#9ca3af',
  },
  badge24h: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badge24hText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B5EA7',
  },
  closedText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  lunchBreak: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
  },
  lunchText: {
    fontSize: 13,
    color: '#92400e',
  },
  holidaysSection: {
    padding: 16,
    paddingTop: 0,
  },
  holidaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  manageText: {
    fontSize: 14,
    color: '#2B5EA7',
    fontWeight: '500',
  },
  holidaysBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  holidaysText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#dbeafe',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});
