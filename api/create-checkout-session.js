const ONVO_CHECKOUT_URL = 'https://api.onvopay.com/v1/checkout/sessions/one-time-link';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.ONVO_SECRET_KEY) {
    console.error('Falta la variable de entorno ONVO_SECRET_KEY en Vercel');
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  try {
    const { items, shipping } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    // Validar y sanear cada item, y convertirlo al formato de OnvoPay (montos en centavos)
    const lineItems = items.map((item) => {
      const price = Number(item.price);
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
      if (!item.name || !isFinite(price) || price <= 0) {
        throw new Error('Invalid cart item');
      }
      return {
        quantity: qty,
        unitAmount: Math.round(price * 100),
        currency: 'USD',
        description: String(item.name).slice(0, 200),
      };
    });

    // Datos de envío: se guardan como metadata de la sesión para que lleguen
    // completos en el webhook cuando se confirme el pago.
    const metadata = {};
    if (shipping && typeof shipping === 'object') {
      if (shipping.name) metadata.shippingName = String(shipping.name).slice(0, 200);
      if (shipping.email) metadata.shippingEmail = String(shipping.email).slice(0, 200);
      if (shipping.phone) metadata.shippingPhone = String(shipping.phone).slice(0, 100);
      if (shipping.address) metadata.shippingAddress = String(shipping.address).slice(0, 300);
      if (shipping.city) metadata.shippingCity = String(shipping.city).slice(0, 200);
    }

    const origin = req.headers.origin || 'https://davidartaviaart.vercel.app';

    const onvoResponse = await fetch(ONVO_CHECKOUT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ONVO_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lineItems,
        redirectUrl: `${origin}/?checkout=success`,
        cancelUrl: `${origin}/?checkout=canceled`,
        paymentMethodTypes: ['card'],
        metadata,
      }),
    });

    const data = await onvoResponse.json();

    if (!onvoResponse.ok || !data.url) {
      console.error('Error de OnvoPay:', data);
      res.status(500).json({ error: 'No se pudo crear la sesión de pago' });
      return;
    }

    res.status(200).json({ url: data.url });
  } catch (err) {
    console.error('Error creando sesión de OnvoPay Checkout:', err);
    res.status(500).json({ error: 'No se pudo crear la sesión de pago' });
  }
};
