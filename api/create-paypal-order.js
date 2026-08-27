const PAYPAL_API_BASE = 'https://api-m.paypal.com'; // Producción (Live). Para pruebas: https://api-m.sandbox.paypal.com

// Obtiene un token de acceso de PayPal usando Client ID + Secret (OAuth2 client_credentials)
async function getPayPalAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    console.error('Error obteniendo access token de PayPal:', data);
    throw new Error('No se pudo autenticar con PayPal');
  }
  return data.access_token;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    console.error('Faltan las variables de entorno PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET en Vercel');
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  try {
    const { items, shipping } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    // Validar y sanear cada item, y calcular el total (PayPal usa el total de la
    // orden, no una lista de precios unitarios como OnvoPay)
    let total = 0;
    const description = items
      .map((item) => {
        const price = Number(item.price);
        const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
        if (!item.name || !isFinite(price) || price <= 0) {
          throw new Error('Invalid cart item');
        }
        total += price * qty;
        return `${item.name} x${qty}`;
      })
      .join(', ')
      .slice(0, 120); // PayPal limita la descripción a 127 caracteres

    total = Math.round(total * 100) / 100; // redondear a centavos

    // Datos de envío: se guardan como custom_id (PayPal no tiene un campo de
    // metadata libre como OnvoPay) para que lleguen en el webhook al confirmarse el pago.
    const metadata = {};
    if (shipping && typeof shipping === 'object') {
      if (shipping.name) metadata.shippingName = String(shipping.name).slice(0, 200);
      if (shipping.email) metadata.shippingEmail = String(shipping.email).slice(0, 200);
      if (shipping.phone) metadata.shippingPhone = String(shipping.phone).slice(0, 100);
      if (shipping.address) metadata.shippingAddress = String(shipping.address).slice(0, 300);
      if (shipping.city) metadata.shippingCity = String(shipping.city).slice(0, 200);
      if (shipping.zip) metadata.shippingZip = String(shipping.zip).slice(0, 50);
      if (shipping.country) metadata.shippingCountry = String(shipping.country).slice(0, 100);
    }

    const origin = req.headers.origin || 'https://davidartaviaart.vercel.app';
    const accessToken = await getPayPalAccessToken();

    const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description,
            custom_id: Buffer.from(JSON.stringify(metadata)).toString('base64').slice(0, 255),
            amount: {
              currency_code: 'USD',
              value: total.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: `${origin}/api/paypal-capture?checkout=success`,
          cancel_url: `${origin}/?checkout=canceled`,
          brand_name: 'David Artavia Art',
          user_action: 'PAY_NOW',
        },
      }),
    });

    const data = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error('Error creando orden de PayPal:', data);
      res.status(500).json({ error: 'No se pudo crear la orden de PayPal' });
      return;
    }

    const approveLink = (data.links || []).find((l) => l.rel === 'approve');
    if (!approveLink) {
      console.error('PayPal no devolvió link de aprobación:', data);
      res.status(500).json({ error: 'No se pudo crear la orden de PayPal' });
      return;
    }

    res.status(200).json({ url: approveLink.href });
  } catch (err) {
    console.error('Error creando orden de PayPal:', err);
    res.status(500).json({ error: 'No se pudo crear la orden de PayPal' });
  }
};
