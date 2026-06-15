import React, { useState, useEffect, useCallback } from 'react';
import { useOrderState } from './hooks/useOrderState.js';
import { useVoiceRecorder } from './hooks/useVoiceRecorder.js';
import { fetchMenu, submitOrder } from './services/api.js';
import { matchVoiceToMenu } from './services/voiceMatcher.js';
import TopBar from './components/TopBar.jsx';
import VoiceCapture from './components/VoiceCapture.jsx';
import QuickAdd from './components/QuickAdd.jsx';
import TranscriptPanel from './components/TranscriptPanel.jsx';
import OrderSummary from './components/OrderSummary.jsx';
import BillingPanel from './components/BillingPanel.jsx';
import InvoiceModal from './components/InvoiceModal.jsx';
import ToastNotification from './components/ToastNotification.jsx';

export default function VoiceBillingPOS() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { orderItems, addItem, updateQuantity, removeItem, clearOrder } = useOrderState();

  // Menu state — fetched once, shared between voice handler and QuickAdd
  const [menuItems, setMenuItems] = useState([]);
  // Ref so the voice callback always sees the latest menu without a stale closure
  const menuItemsRef = React.useRef([]);

  const [tableNumber, setTableNumber]   = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [lastTranscript, setLastTranscript] = useState('');
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [finalOrder, setFinalOrder]         = useState(null);
  const [toasts, setToasts]                 = useState([]);
  // 'en-IN' | 'hi-IN' | 'hinglish' — Hinglish uses en-IN + expanded alias/noise pipeline
  const [voiceLang, setVoiceLang]           = useState('en-IN');

  useEffect(() => { menuItemsRef.current = menuItems; }, [menuItems]);

  useEffect(() => {
    fetchMenu()
      .then(res => { if (res.success) setMenuItems(res.data); })
      .catch(err => console.error('Menu fetch failed:', err));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // FIX: Keep addToast in a ref so handleSegmentComplete never needs it as a dep.
  // Without this, addToast recreates each render → handleSegmentComplete recreates →
  // callbackRef updates every render → disrupts debounce timing in the voice hook.
  const addToastRef = React.useRef(addToast);
  useEffect(() => { addToastRef.current = addToast; }, [addToast]);

  /**
   * Fired instantly for every phrase the Speech API finalises while mic is open.
   * Mic stays open — no time limit — mic only stops on:
   *   1. User taps the Stop button
   *   2. User clicks "Generate Invoice" (order complete)
   */
  // FIX: addItem ref prevents handleSegmentComplete from depending on addItem identity.
  const addItemRef = React.useRef(addItem);
  useEffect(() => { addItemRef.current = addItem; }, [addItem]);

  /**
   * Fired instantly for every phrase the Speech API finalises while mic is open.
   * Mic stays open — no time limit — mic only stops on:
   *   1. User taps the Stop button
   *   2. User clicks "Generate Invoice" (order complete)
   *
   * FIX: Uses addToastRef and addItemRef so this callback is truly stable
   * (empty dep array). A changing callback identity would update callbackRef
   * in useVoiceRecorder on every render, causing debounce map inconsistencies.
   */
  const handleSegmentComplete = useCallback((alternatives) => {
    if (!alternatives?.length) return;
    const menu = menuItemsRef.current;
    if (!menu.length) return;

    const { matched, notFound, usedTranscript } = matchVoiceToMenu(alternatives, menu);
    if (usedTranscript) setLastTranscript(usedTranscript);

    if (matched.length === 0) {
      if (notFound.length) addToastRef.current(`Not found: "${notFound.join('", "')}" — try again`, 'info');
      return;
    }

    for (const { menuItem, quantity } of matched) {
      for (let i = 0; i < quantity; i++) {
        addItemRef.current({
          menuItemId: menuItem._id,
          name: menuItem.name,
          quantity: 1,
          unitPrice: menuItem.price,
          totalPrice: menuItem.price,
        });
      }
    }

    const summary = matched.map(m => `${m.quantity}× ${m.menuItem.name}`).join(', ');
    const warn    = notFound.length ? ` (not found: ${notFound.join(', ')})` : '';
    addToastRef.current(`Added: ${summary}${warn}`, 'success');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — all deps accessed via stable refs


  // ── Voice recorder — owned here so parent can stop it on order submit ──
  const {
    isRecording,
    interimText,
    duration,
    status,
    error: micError,
    startRecording,
    stopRecording,
  } = useVoiceRecorder({
    onSegmentComplete: handleSegmentComplete,
    // Hinglish is best handled by en-IN + our alias/noise pipeline
    lang: voiceLang === 'hinglish' ? 'en-IN' : voiceLang,
  });

  const subtotal   = orderItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const taxAmount  = subtotal * 0.05;
  const grandTotal = subtotal + taxAmount;

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) return;

    // Stop the mic automatically when the order is completed
    // so the user doesn't keep speaking into an active session
    if (isRecording) stopRecording();

    setIsSubmitting(true);
    try {
      const payload = {
        items: orderItems.map(i => ({ name: i.name, qty: i.quantity })),
        tableNumber: tableNumber || 1,
        customerName: customerName || 'Guest',
        paymentMethod,
        transcript: lastTranscript,
      };

      const res = await submitOrder(payload);
      const mappedOrder = res.data || res.order || res;

      if (res.warnings?.notFound?.length)
        addToast(`Warning: not found: ${res.warnings.notFound.join(', ')}`, 'info');
      if (res.warnings?.unavailable?.length)
        addToast(`Warning: unavailable: ${res.warnings.unavailable.join(', ')}`, 'error');

      setFinalOrder(mappedOrder);
      addToast('Invoice generated successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to finalize order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseInvoice = () => {
    setFinalOrder(null);
    clearOrder();
    setTableNumber('');
    setCustomerName('');
    setLastTranscript('');
    // Mic is already stopped — user taps it again when ready for next order
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-indigo-500/30 pb-12">
      <TopBar currentTime={currentTime} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          <div className="md:col-span-4 space-y-6 flex flex-col">
            {/* Recorder state owned here — parent stops mic on invoice generation */}
            <VoiceCapture
              isRecording={isRecording}
              interimText={interimText}
              duration={duration}
              status={status}
              error={micError}
              lang={voiceLang}
              onLangChange={setVoiceLang}
              onStart={startRecording}
              onStop={stopRecording}
            />
            <QuickAdd menuItems={menuItems} onAdd={addItem} />
            <div className="flex-1">
              <TranscriptPanel transcript={lastTranscript} />
            </div>
          </div>

          <div className="md:col-span-4">
            <OrderSummary
              orderItems={orderItems}
              updateQuantity={updateQuantity}
              removeItem={removeItem}
            />
          </div>

          <div className="md:col-span-4">
            <BillingPanel
              orderItems={orderItems}
              billingTotals={{ subtotal, taxAmount, grandTotal }}
              tableNumber={tableNumber}
              setTableNumber={setTableNumber}
              customerName={customerName}
              setCustomerName={setCustomerName}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              onSubmitOrder={handleSubmitOrder}
              isSubmitting={isSubmitting}
            />
          </div>

        </div>
      </main>

      {toasts.length > 0 && <ToastNotification toasts={toasts} removeToast={(id) => setToasts(p => p.filter(t => t.id !== id))} />}

      {finalOrder && (
        <InvoiceModal order={finalOrder} onClose={handleCloseInvoice} />
      )}
    </div>
  );
}
