/**
 * Log leve para o app: debug/info só em __DEV__; warn/error sempre no native log
 * (sem Winston — evita ruído e dados sensíveis em produção).
 */

const isDev = __DEV__;

export const log = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  /** Extra args (e.g. React errorInfo) are logged only in __DEV__. */
  error: (message: string, err?: unknown, ...extra: unknown[]) => {
    if (err instanceof Error) {
      console.error(message, err.message);
    } else if (err != null) {
      console.error(message, String(err));
    } else {
      console.error(message);
    }
    if (isDev && extra.length > 0) {
      console.error(...extra);
    }
  },
};
