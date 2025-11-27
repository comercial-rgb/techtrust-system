/**
 * Tela de Cadastro
 * ✨ Atualizada com animações e UI melhorada
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { TextInput, Text, useTheme } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

// ✨ Importando componentes de UI
import {
  FadeInView,
  SlideInView,
  ShakeView,
  ScalePress,
  Toast,
  useToast,
  LoadingOverlay,
  EnhancedButton,
} from '../components';

export default function SignupScreen({ navigation }: any) {
  const theme = useTheme();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);

  // ✨ Toast hook
  const { toast, error, hideToast } = useToast();

  async function handleSignup() {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setHasError(true);
      error('Preencha todos os campos');
      setTimeout(() => setHasError(false), 500);
      return;
    }

    if (password !== confirmPassword) {
      setHasError(true);
      error('As senhas não coincidem');
      setTimeout(() => setHasError(false), 500);
      return;
    }

    if (password.length < 8) {
      setHasError(true);
      error('A senha deve ter no mínimo 8 caracteres');
      setTimeout(() => setHasError(false), 500);
      return;
    }

    setLoading(true);
    try {
      const { userId } = await signUp({
        fullName,
        email,
        phone,
        password,
        language: 'PT',
      });

      navigation.navigate('OTP', { userId, phone });
    } catch (err: any) {
      setHasError(true);
      error(err.message || 'Erro ao criar conta');
      setTimeout(() => setHasError(false), 500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ✨ Logo e Header animados */}
        <FadeInView delay={0}>
          <View style={styles.logoContainer}>
            <View style={[styles.logoCircle, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.logoText}>✨</Text>
            </View>
          </View>
        </FadeInView>

        <SlideInView direction="up" delay={100}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
              Criar Conta
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Cadastre-se para começar
            </Text>
          </View>
        </SlideInView>

        {/* ✨ Formulário com animação */}
        <SlideInView direction="up" delay={200}>
          <ShakeView shake={hasError}>
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput
                  label="Nome Completo"
                  value={fullName}
                  onChangeText={setFullName}
                  mode="outlined"
                  left={<TextInput.Icon icon="account" />}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  error={hasError && !fullName}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  left={<TextInput.Icon icon="email" />}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  error={hasError && !email}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Telefone (+14075551234)"
                  value={phone}
                  onChangeText={setPhone}
                  mode="outlined"
                  keyboardType="phone-pad"
                  left={<TextInput.Icon icon="phone" />}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  error={hasError && !phone}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Senha"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  left={<TextInput.Icon icon="lock" />}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  error={hasError && !password}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Confirmar Senha"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  left={<TextInput.Icon icon="lock-check" />}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  error={hasError && !confirmPassword}
                />
              </View>

              {/* ✨ Dica de senha */}
              <FadeInView delay={300}>
                <View style={styles.hintContainer}>
                  <Text style={styles.hintIcon}>💡</Text>
                  <Text style={styles.hintText}>
                    A senha deve ter no mínimo 8 caracteres
                  </Text>
                </View>
              </FadeInView>

              {/* ✨ Botão de cadastrar */}
              <FadeInView delay={350}>
                <EnhancedButton
                  title="Criar Conta"
                  onPress={handleSignup}
                  variant="primary"
                  size="large"
                  icon="account-plus"
                  fullWidth
                  loading={loading}
                />
              </FadeInView>
            </View>
          </ShakeView>
        </SlideInView>

        {/* ✨ Link para login */}
        <FadeInView delay={400}>
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Já tem uma conta? </Text>
            <ScalePress onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLink, { color: theme.colors.primary }]}>
                Faça login
              </Text>
            </ScalePress>
          </View>
        </FadeInView>

        {/* ✨ Footer */}
        <FadeInView delay={450}>
          <Text style={styles.footer}>
            Ao criar sua conta, você concorda com nossos{'\n'}
            <Text style={{ color: theme.colors.primary }}>Termos de Uso</Text> e{' '}
            <Text style={{ color: theme.colors.primary }}>Política de Privacidade</Text>
          </Text>
        </FadeInView>
      </ScrollView>

      {/* ✨ Loading Overlay */}
      <LoadingOverlay visible={loading} message="Criando sua conta..." />

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
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    opacity: 0.6,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#fff',
  },
  inputOutline: {
    borderRadius: 12,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  hintIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  hintText: {
    fontSize: 13,
    color: '#92400e',
    flex: 1,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#666',
  },
  loginLink: {
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 28,
    lineHeight: 18,
  },
});
