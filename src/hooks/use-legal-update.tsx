import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';

import { acceptLegal, getAccount } from '@/api/account';
import { ApiError } from '@/api/client';
import { getStorePolicy } from '@/api/info';
import { useAuth } from '@/hooks/use-auth';

type LegalUpdateValue = {
  /** The customer must accept the new Aviso and Terms before going on. */
  required: boolean;
  accepting: boolean;
  error: string | null;
  accept: () => Promise<void>;
  /**
   * The checkout answered 409 legal_update_required: shows the acceptance screen and resolves
   * true once accepted, so the order can be retried.
   */
  requestAcceptance: () => Promise<boolean>;
};

const LegalUpdateContext = createContext<LegalUpdateValue | null>(null);

/**
 * When the restaurant changes the Aviso or the Terms, a signed-in customer accepts the new
 * versions before using the app (LFPDPPP: changes are communicated; Código de Comercio: proof
 * of which version each person accepted). The server says it with `legal_update_required`.
 */
export function LegalUpdateProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const [required, setRequired] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const waiting = useRef<((accepted: boolean) => void)[]>([]);
  const isCustomer = status === 'authenticated' && user?.role === 'cliente';

  useEffect(() => {
    if (!isCustomer) return;
    const controller = new AbortController();
    getAccount(controller.signal)
      .then((account) => setRequired(account.legalUpdateRequired))
      .catch(() => {}); // offline: asked again on the next launch or by the checkout
    return () => controller.abort();
  }, [isCustomer, user?.id]);

  const settle = (accepted: boolean) => {
    waiting.current.splice(0).forEach((resolve) => resolve(accepted));
  };

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      // Always the versions published right now, never a saved copy.
      const policy = await getStorePolicy();
      if (!policy.termsVersion || !policy.privacyVersion) {
        throw new ApiError('No pudimos confirmar la versión de los textos. Intenta de nuevo en un momento.', 0);
      }
      await acceptLegal({ termsVersion: policy.termsVersion, privacyVersion: policy.privacyVersion });
      setRequired(false);
      settle(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar tu aceptación. Intenta de nuevo.');
    } finally {
      setAccepting(false);
    }
  };

  const requestAcceptance = () => {
    // Guests have no account to record it on: the checkout shows the server's message.
    if (!isCustomer) return Promise.resolve(false);
    setRequired(true);
    return new Promise<boolean>((resolve) => waiting.current.push(resolve));
  };

  return (
    // Only a signed-in customer is asked (staff have their own notice as employees).
    <LegalUpdateContext value={{ required: isCustomer && required, accepting, error, accept, requestAcceptance }}>
      {children}
    </LegalUpdateContext>
  );
}

export function useLegalUpdate() {
  const context = use(LegalUpdateContext);
  if (!context) throw new Error('useLegalUpdate must be used inside LegalUpdateProvider');
  return context;
}
