/**
 * Tela de Adicionar Veículo
 * ✨ Atualizada com animações e UI melhorada
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, Text, useTheme } from 'react-native-paper';
import api from '../services/api';

// ✨ Importando componentes de UI
import {
  FadeInView,
  SlideInView,
  ScalePress,
  ShakeView,
  Toast,
  useToast,
  LoadingOverlay,
  SuccessAnimation,
  EnhancedButton,
} from '../components';

export default function AddVehicleScreen({ navigation }: any) {
  const theme = useTheme();

  const [plateNumber, setPlateNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [currentMileage, setCurrentMileage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // ✨ Toast hook
  const { toast, success, error, hideToast } = useToast();

  async function handleSubmit() {
    if (!plateNumber || !make || !model || !year) {
      setHasError(true);
      error('Preencha os campos obrigatórios');
      setTimeout(() => setHasError(false), 500);
      return;
    }

    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2026) {
      setHasError(true);
      error('Ano inválido');
      setTimeout(() => setHasError(false), 500);
      return;
    }

    setLoading(true);
    try {
      await api.post('/vehicles', {
        plateNumber: plateNumber.toUpperCase(),
        make,
        model,
        year: yearNum,
        color: color || undefined,
        currentMileage: currentMileage ? parseInt(currentMileage) : undefined,
      });

      setShowSuccess(true);
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao adicionar veículo');
    } finally {
      setLoading(false);
    }
  }

  const handleSuccessComplete = () => {
    setShowSuccess(false);
    navigation.goBack();
  };

  // ✨ Dados populares para sugestão
  const popularMakes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Volkswagen', 'Fiat', 'Hyundai'];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ✨ Header animado */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.headerIcon}>🚗</Text>
            </View>
            <Text variant="titleLarge" style={[styles.title, { color: theme.colors.primary }]}>
              Adicionar Veículo
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Preencha os dados do seu veículo
            </Text>
          </View>
        </FadeInView>

        {/* ✨ Formulário com animações */}
        <ShakeView shake={hasError}>
          <View style={styles.form}>
            {/* Placa */}
            <SlideInView direction="left" delay={100}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🔢 Placa *</Text>
                <TextInput
                  value={plateNumber}
                  onChangeText={(text) => setPlateNumber(text.toUpperCase())}
                  mode="outlined"
                  placeholder="ABC1D23"
                  autoCapitalize="characters"
                  maxLength={10}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  error={hasError && !plateNumber}
                />
              </View>
            </SlideInView>

            {/* Marca */}
            <SlideInView direction="right" delay={150}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🏭 Marca *</Text>
                <TextInput
                  value={make}
                  onChangeText={setMake}
                  mode="outlined"
                  placeholder="Ex: Toyota, Honda, Ford"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  error={hasError && !make}
                />
                {/* ✨ Quick suggestions */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions}>
                  {popularMakes.map((m) => (
                    <ScalePress key={m} onPress={() => setMake(m)}>
                      <View style={[styles.suggestionChip, make === m && { backgroundColor: theme.colors.primary }]}>
                        <Text style={[styles.suggestionText, make === m && { color: '#fff' }]}>{m}</Text>
                      </View>
                    </ScalePress>
                  ))}
                </ScrollView>
              </View>
            </SlideInView>

            {/* Modelo */}
            <SlideInView direction="left" delay={200}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🚙 Modelo *</Text>
                <TextInput
                  value={model}
                  onChangeText={setModel}
                  mode="outlined"
                  placeholder="Ex: Corolla, Civic, Focus"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  error={hasError && !model}
                />
              </View>
            </SlideInView>

            {/* Ano */}
            <SlideInView direction="right" delay={250}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📅 Ano *</Text>
                <TextInput
                  value={year}
                  onChangeText={setYear}
                  mode="outlined"
                  placeholder="2020"
                  keyboardType="number-pad"
                  maxLength={4}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  error={hasError && !year}
                />
              </View>
            </SlideInView>

            {/* Cor */}
            <SlideInView direction="left" delay={300}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🎨 Cor (opcional)</Text>
                <TextInput
                  value={color}
                  onChangeText={setColor}
                  mode="outlined"
                  placeholder="Ex: Preto, Branco, Prata"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                />
                {/* ✨ Color suggestions */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions}>
                  {['Preto', 'Branco', 'Prata', 'Cinza', 'Vermelho', 'Azul'].map((c) => (
                    <ScalePress key={c} onPress={() => setColor(c)}>
                      <View style={[styles.suggestionChip, color === c && { backgroundColor: theme.colors.primary }]}>
                        <Text style={[styles.suggestionText, color === c && { color: '#fff' }]}>{c}</Text>
                      </View>
                    </ScalePress>
                  ))}
                </ScrollView>
              </View>
            </SlideInView>

            {/* Quilometragem */}
            <SlideInView direction="right" delay={350}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📍 Quilometragem (opcional)</Text>
                <TextInput
                  value={currentMileage}
                  onChangeText={setCurrentMileage}
                  mode="outlined"
                  placeholder="50000"
                  keyboardType="number-pad"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                />
              </View>
            </SlideInView>

            {/* Nota */}
            <FadeInView delay={400}>
              <View style={styles.noteContainer}>
                <Text style={styles.noteIcon}>💡</Text>
                <Text style={styles.noteText}>
                  Campos com * são obrigatórios
                </Text>
              </View>
            </FadeInView>

            {/* Botões */}
            <FadeInView delay={450}>
              <View style={styles.buttonsContainer}>
                <EnhancedButton
                  title="Adicionar Veículo"
                  onPress={handleSubmit}
                  variant="primary"
                  size="large"
                  icon="car"
                  fullWidth
                  loading={loading}
                />

                <EnhancedButton
                  title="Cancelar"
                  onPress={() => navigation.goBack()}
                  variant="ghost"
                  size="medium"
                  fullWidth
                  style={{ marginTop: 8 }}
                />
              </View>
            </FadeInView>
          </View>
        </ShakeView>
      </ScrollView>

      {/* ✨ Loading Overlay */}
      <LoadingOverlay visible={loading} message="Adicionando veículo..." />

      {/* ✨ Success Animation */}
      <SuccessAnimation
        visible={showSuccess}
        message="Veículo adicionado!"
        onComplete={handleSuccessComplete}
      />

      {/* ✨ Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    fontSize: 32,
  },
  title: {
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.6,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
  },
  inputOutline: {
    borderRadius: 12,
  },
  suggestions: {
    marginTop: 10,
    marginHorizontal: -4,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4b5563',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  noteIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#92400e',
    flex: 1,
  },
  buttonsContainer: {
    marginTop: 8,
  },
});
