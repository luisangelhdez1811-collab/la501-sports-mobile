import { useState } from 'react';

import { getMyOrders, requestOrderOtp, verifyOrderOtp, type OrderSummary } from '@/api/account';
import { errorMessage } from '@/api/client';
import { useCachedResource } from '@/hooks/use-cached-resource';
import { useCooldown } from '@/hooks/use-cooldown';
import { isCompleteCode, isPhone } from '@/utils/validation';

/** The signed-in customer's orders. */
export function useMyOrders(enabled: boolean) {
  return useCachedResource<OrderSummary[]>('my-orders', getMyOrders, { enabled });
}

type LookupStep = 'phone' | 'code' | 'results';

/** Guests find their orders with the phone used at checkout plus a one-time SMS code. */
export function useGuestOrderLookup() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<LookupStep>('phone');
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cooldown = useCooldown();

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const sendCode = () => {
    if (!isPhone(phone)) return setError('El teléfono debe tener 10 dígitos.');
    return run(async () => {
      await cooldown.track(() => requestOrderOtp(phone));
      if (step === 'code') setNotice('Te enviamos un código nuevo.');
      setStep('code');
    });
  };

  const verify = () => {
    if (!isCompleteCode(code)) return setError('Escribe el código de 6 dígitos que te enviamos.');
    return run(async () => {
      setOrders(await verifyOrderOtp(phone, code));
      setStep('results');
    });
  };

  /** Back to typing a phone (another one, or a typo). */
  const changePhone = () => {
    setStep('phone');
    setCode('');
    setOrders([]);
    setNotice(null);
  };

  return { phone, setPhone, code, setCode, step, orders, submitting, error, notice, cooldownRemaining: cooldown.remaining, sendCode, verify, changePhone };
}
