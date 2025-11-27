/**
 * Tela de Login
 * ✨ Atualizada com animações e UI melhorada
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
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
} from '../components';

export default function LoginScreen({ navigation }: any) {
  const theme = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);

  // ✨ Toast hook
  const { toast, error, hideToast } = useToast();

  async function handleLogin() {
    if (!email || !password) {
      setHasError(true);
      error('Preencha todos os campos');
      setTimeout(() => setHasError(false), 500);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setHasError(true);
      error(err.message || 'Erro ao fazer login');
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
              <Text style={styles.logoText}>🚗</Text>
            </View>
          </View>
        </FadeInView>

        <SlideInView direction="up" delay={100}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
              Bem-vindo de volta!
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Entre na sua conta para continuar
            </Text>
          </View>
        </SlideInView>

        {/* ✨ Formulário com animação */}
        <SlideInView direction="up" delay={200}>
          <ShakeView shake={hasError}>
            <View style={styles.form}>
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

              <ScalePress onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}>
                <Text style={[styles.forgotPassword, { color: theme.colors.primary }]}>
                  Esqueceu sua senha?
                </Text>
              </ScalePress>

              <ScalePress onPress={handleLogin}>
                <View style={[styles.loginButton, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.loginButtonText}>Entrar</Text>
                </View>
              </ScalePress>
            </View>
          </ShakeView>
        </SlideInView>

        {/* ✨ Separador */}
        <FadeInView delay={300}>
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>
        </FadeInView>

        {/* ✨ Link para cadastro */}
        <FadeInView delay={400}>
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Não tem uma conta? </Text>
            <ScalePress onPress={() => navigation.navigate('Signup')}>
              <Text style={[styles.signupLink, { color: theme.colors.primary }]}>
                Cadastre-se
              </Text>
            </ScalePress>
          </View>
        </FadeInView>

        {/* ✨ Footer */}
        <FadeInView delay={500}>
          <Text style={styles.footer}>
            Ao continuar, você concorda com nossos{'\n'}
            <Text style={{ color: theme.colors.primary }}>Termos de Uso</Text> e{' '}
            <Text style={{ color: theme.colors.primary }}>Política de Privacidade</Text>
          </Text>
        </FadeInView>
      </ScrollView>

      {/* ✨ Loading Overlay */}
      <LoadingOverlay visible={loading} message="Entrando..." />

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
    marginBottom: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
  },
  inputOutline: {
    borderRadius: 12,
  },
  forgotPassword: {
    textAlign: 'right',
    fontWeight: '600',
    marginBottom: 24,
  },
  loginButton: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9e9e9e',
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: '#666',
  },
  signupLink: {
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 32,
    lineHeight: 18,
  },
});
