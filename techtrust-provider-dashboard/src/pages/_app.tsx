import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/Toast'
import { I18nProvider } from '@/i18n'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <I18nProvider>
      <AuthProvider>
        <ToastProvider>
          <Component {...pageProps} />
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  )
}
