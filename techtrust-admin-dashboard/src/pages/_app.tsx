import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { I18nProvider } from '../i18n';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <I18nProvider>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </I18nProvider>
  );
}
