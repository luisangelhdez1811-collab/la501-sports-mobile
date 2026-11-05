import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import { ApiError, errorMessage } from '@/api/client';
import { checkout, type CheckoutResult, type PaymentMethod } from '@/api/orders';
import { followOrder } from '@/data/followed-orders';
import { askNotificationPermission } from '@/data/local-notifications';
import { hasNotes, isAlcoholic, missingConsent, requiresAdult } from '@/domain/checkout-rules';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { useLegalUpdate } from '@/hooks/use-legal-update';
import { useStorePolicy } from '@/hooks/use-store-policy';
import { isEmail, isPhone } from '@/utils/validation';

export type CheckoutField = 'name' | 'phone' | 'email' | 'address' | 'payment' | 'delivery';
export type CheckoutErrors = Partial<Record<CheckoutField, string>>;

/** What the screen must do after "Confirmar pedido" when it isn't a simple message. */
export type SubmitOutcome =
  | { kind: 'sent' }
  | { kind: 'stopped' }
  /** A product or offer is gone: go back to the cart. */
  | { kind: 'item_unavailable'; message: string }
  /** Licence hours or dry law: offer to take the drinks with alcohol out. */
  | { kind: 'alcohol_closed'; message: string };

const codeOf = (err: unknown) => (err instanceof ApiError ? err.code : null);

/**
 * Checkout ViewModel (MVVM): the form, the confirmations the law asks for and sending the
 * order. The screen only draws it. The app checks the rules for a good experience; the
 * server decides (`missingConsent`, `alcohol_sales_closed`, `legal_update_required`…).
 */
export function useCheckout() {
  const cart = useCart();
  const { user } = useAuth();
  const policy = useStorePolicy();
  const legal = useLegalUpdate();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [deliveryTerms, setDeliveryTermsState] = useState(false);
  const [adult, setAdult] = useState(false);
  const [healthConsent, setHealthConsent] = useState(false);
  // The server found alcohol the app didn't (e.g. in a promotion): ask for 18+ anyway.
  const [serverWantsAdult, setServerWantsAdult] = useState(false);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Card payments paused after it was picked: it no longer counts as chosen.
  const method = payment === 'tarjeta' && !policy.cardPayments ? null : payment;
  const withAlcohol = requiresAdult(cart.items);
  const adultRequired = withAlcohol || serverWantsAdult;
  const notesWritten = hasNotes(cart.items);
  const alcoholClosed = withAlcohol && !policy.alcohol.salesOpen;

  const setDeliveryTerms = (accepted: boolean) => {
    setDeliveryTermsState(accepted);
    if (accepted) setErrors((e) => ({ ...e, delivery: undefined }));
  };

  const removeAlcohol = () => cart.items.filter(isAlcoholic).forEach((item) => cart.remove(item.lineId));

  const validate = (): CheckoutErrors => {
    const next: CheckoutErrors = {};
    if (name.trim().length < 3) next.name = 'Escribe tu nombre completo.';
    if (!isPhone(phone)) next.phone = 'El teléfono debe tener 10 dígitos.';
    if (email.trim() && !isEmail(email)) next.email = 'Correo electrónico no válido.';
    if (address.trim().length < 10) next.address = 'Escribe calle, número, colonia y una referencia.';
    if (!method) next.payment = 'Elige cómo vas a pagar.';
    if (!deliveryTerms) next.delivery = 'Confirma que leíste cómo se cobra el envío.';
    return next;
  };

  const send = (clientRef: string) =>
    checkout({
      items: cart.items,
      name,
      phone,
      address,
      email,
      paymentMethod: method!,
      clientRef,
      deliveryTermsAccepted: deliveryTerms,
      adultConfirmed: adultRequired && adult,
      healthDataConsent: notesWritten && healthConsent,
    });

  // Retries that don't change the order: a reference taken by someone else (very unlikely)
  // and new legal texts accepted on the spot. Each happens at most once.
  const sendWithRetries = async (): Promise<CheckoutResult> => {
    let renewed = false;
    let accepted = false;
    let ref = cart.clientRef();
    for (;;) {
      try {
        return await send(ref);
      } catch (err) {
        const code = codeOf(err);
        if (code === 'duplicate_reference' && !renewed) {
          renewed = true;
          ref = cart.renewClientRef();
        } else if (code === 'legal_update_required' && !accepted && (await legal.requestAcceptance())) {
          accepted = true;
        } else {
          throw err;
        }
      }
    }
  };

  const finish = async (result: CheckoutResult) => {
    // From now on the app tells the customer when the order leaves the kitchen; the system
    // asks for permission here, when the reason is obvious.
    await followOrder(result.trackingToken);
    askNotificationPermission();
    const track = () => router.replace({ pathname: '/pedido/[token]', params: { token: result.trackingToken } });
    if (result.paymentMethod !== 'tarjeta') {
      // Cash: the order is placed as soon as the server answers.
      cart.clear();
      return track();
    }
    // Card: the cart stays until tracking sees the payment confirmed, so a rejected or
    // abandoned payment can be retried with the same reference (no second order).
    cart.holdForPayment(result.trackingToken);
    // A retry of the same order (duplicate) still comes with a link while it's unpaid: the
    // server only sends one then, and it's for that same order.
    if (result.checkoutUrl) {
      // The bank's page opens in the system browser (Chrome Custom Tabs / Safari), never a
      // WebView: the customer sees the real address and the app can't read card data.
      await WebBrowser.openBrowserAsync(result.checkoutUrl, { dismissButtonStyle: 'close', showTitle: true });
    }
    track();
  };

  const submit = async (): Promise<SubmitOutcome> => {
    // Checkout needs the server id of every item.
    if (cart.items.some((item) => item.product.id === null)) {
      setFormError('Algunos productos aún no se pueden pedir desde la app. Intenta más tarde o pide por teléfono.');
      return { kind: 'stopped' };
    }
    if (alcoholClosed) return { kind: 'alcohol_closed', message: policy.alcohol.closedMessage };
    const next = validate();
    setErrors(next);
    const fields = Object.keys(next);
    if (fields.length > 0) {
      setFormError(next.delivery && fields.length === 1 ? next.delivery : 'Revisa los campos marcados.');
      return { kind: 'stopped' };
    }
    const missing = missingConsent(
      cart.items,
      { deliveryTermsAccepted: deliveryTerms, adultConfirmed: adult, healthDataConsent: healthConsent },
      adultRequired,
    );
    if (missing) {
      setFormError(missing);
      return { kind: 'stopped' };
    }

    setFormError(null);
    setSubmitting(true);
    try {
      await finish(await sendWithRetries());
      return { kind: 'sent' };
    } catch (err) {
      setSubmitting(false);
      const code = codeOf(err);
      const message = errorMessage(err);
      if (code === 'confirmation_required' && /18/.test(message)) setServerWantsAdult(true);
      if (code === 'mercadopago_unavailable') {
        setFormError('Mercado Pago no respondió. Intenta de nuevo en un momento o paga en efectivo.');
        return { kind: 'stopped' };
      }
      if (code === 'item_unavailable') return { kind: 'item_unavailable', message };
      if (code === 'alcohol_sales_closed') return { kind: 'alcohol_closed', message };
      setFormError(message);
      return { kind: 'stopped' };
    }
  };

  return {
    items: cart.items,
    total: cart.total,
    policy,
    form: { name, setName, phone, setPhone, email, setEmail, address, setAddress },
    method,
    choosePayment: setPayment,
    consents: { deliveryTerms, setDeliveryTerms, adult, setAdult, healthConsent, setHealthConsent },
    adultRequired,
    notesWritten,
    withAlcohol,
    removeAlcohol,
    errors,
    formError,
    submitting,
    submit,
  };
}
