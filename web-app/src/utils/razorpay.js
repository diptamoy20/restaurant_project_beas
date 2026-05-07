const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let razorpayScriptPromise;

export function loadRazorpayScript() {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

export function openRazorpayCheckout(options) {
  if (!window.Razorpay) {
    throw new Error('Razorpay SDK is not loaded');
  }

  const razorpayCheckout = new window.Razorpay(options);
  razorpayCheckout.open();
  return razorpayCheckout;
}
