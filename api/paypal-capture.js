const PAYPAL_API_BASE = 'https://api-m.paypal.com'; // Producción (Live). Para pruebas: https://api-m.sandbox.paypal.com

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

async function sendSaleEmail({ customerName, customerEmail, metadata, description, totalFormatted, orderId }) {
  if (!process.env.RESEND_API_KEY) {
    console.error('Falta la variable de entorno RESEND_API_KEY en Vercel');
    return;
  }

  const emailHtml = `
    <h2>🎨 Nueva venta en davidartaviaart.vercel.app (PayPal)</h2>
    <p><strong>Cliente:</strong> ${customerName || metadata.shippingName || 'No proporcionado'}</p>
    <p><strong>Correo:</strong> ${customerEmail || metadata.shippingEmail || 'No proporcionado'}</p>
    <p><strong>Teléfono:</strong> ${metadata.shippingPhone || 'No proporcionado'}</p>
    <p><strong>Dirección de envío:</strong> ${metadata.shippingAddress || 'No proporcionada'}</p>
    <p><strong>Ciudad / Provincia / País:</strong> ${metadata.shippingCity || 'No proporcionada'}</p>
    <p><strong>Obras:</strong><br>${description || 'No especificado'}</p>
    <p><strong>Total:</strong> ${totalFormatted}</p>
    <p><strong>ID de la orden PayPal:</strong> ${orderId || ''}</p>
  `;

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'David Artavia Art <ventas@davidartaviastudio.com>',
      to: ['estudioarte.da@gmail.com'],
      subject: `🎨 Nueva venta (PayPal) — ${totalFormatted}`,
      html: emailHtml,
    }),
  });

  const emailResultText = await emailResponse.text();
  if (!emailResponse.ok) {
    console.error('Error enviando el correo de notificación de venta (PayPal):', emailResultText);
  } else {
    console.log('Correo de venta (PayPal) enviado. Respuesta de Resend:', emailResultText);
  }
}

module.exports = async (req, res) => {
  // PayPal redirige al cliente de vuelta con el ID de la orden como query param "token"
  const orderId = req.query && req.query.token;
  const origin = `https://${req.headers.host || 'davidartaviaart.vercel.app'}`;

  if (!orderId) {
    res.redirect(302, `${origin}/?checkout=canceled`);
    return;
  }

  try {
    const accessToken = await getPayPalAccessToken();

    // Capturar el pago (confirma el cobro definitivo del dinero)
    const captureResponse = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const captureData = await captureResponse.json();

    if (!captureResponse.ok || captureData.status !== 'COMPLETED') {
      console.error('Error capturando orden de PayPal:', captureData);
      res.redirect(302, `${origin}/?checkout=canceled`);
      return;
    }

    // Extraer los datos de la compra para el correo de aviso
    const purchaseUnit = (captureData.purchase_units || [])[0] || {};
    const capture = (purchaseUnit.payments && purchaseUnit.payments.captures && purchaseUnit.payments.captures[0]) || {};
    const payer = captureData.payer || {};

    let metadata = {};
    try {
      if (purchaseUnit.custom_id) {
        metadata = JSON.parse(Buffer.from(purchaseUnit.custom_id, 'base64').toString('utf8'));
      }
    } catch (e) {
      console.error('No se pudo parsear el custom_id de PayPal:', e);
    }

    const totalFormatted = `${capture.amount ? capture.amount.currency_code : 'USD'} ${capture.amount ? capture.amount.value : ''}`;
    const customerName = payer.name ? `${payer.name.given_name || ''} ${payer.name.surname || ''}`.trim() : '';
    const customerEmail = payer.email_address || '';

    await sendSaleEmail({
      customerName,
      customerEmail,
      metadata,
      description: purchaseUnit.description,
      totalFormatted,
      orderId,
    });

    res.redirect(302, `${origin}/?checkout=success`);
  } catch (err) {
    console.error('Error capturando pago de PayPal:', err);
    res.redirect(302, `${origin}/?checkout=canceled`);
  }
};
