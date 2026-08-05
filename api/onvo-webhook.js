module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Verificar que el webhook realmente viene de OnvoPay
  const receivedSecret = req.headers['x-webhook-secret'];
  if (!process.env.ONVO_WEBHOOK_SECRET || receivedSecret !== process.env.ONVO_WEBHOOK_SECRET) {
    console.error('Webhook con secreto inválido o faltante');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const event = req.body || {};

    // Por ahora solo nos interesa cuando se completa una compra
    if (event.type !== 'checkout-session.succeeded') {
      res.status(200).json({ received: true });
      return;
    }

    const data = event.data || {};
    const customer = data.customer || {};
    const lineItems = data.lineItems || [];
    const metadata = data.metadata || {};

    const itemsList = lineItems
      .map((it) => `- ${it.name} (${it.currency} ${(it.amount / 100).toLocaleString()})`)
      .join('\n');

    const totalFormatted = `${data.currency || 'CRC'} ${((data.amountTotal || 0) / 100).toLocaleString()}`;

    const emailHtml = `
      <h2>🎨 Nueva venta en davidartaviaart.vercel.app</h2>
      <p><strong>Cliente:</strong> ${customer.name || metadata.shippingName || 'No proporcionado'}</p>
      <p><strong>Correo:</strong> ${customer.email || metadata.shippingEmail || 'No proporcionado'}</p>
      <p><strong>Teléfono:</strong> ${customer.phone || metadata.shippingPhone || 'No proporcionado'}</p>
      <p><strong>Dirección de envío:</strong> ${metadata.shippingAddress || 'No proporcionada'}</p>
      <p><strong>Ciudad / Provincia / País:</strong> ${metadata.shippingCity || 'No proporcionada'}</p>
      <p><strong>Obras:</strong><br>${(itemsList || 'No especificado').replace(/\n/g, '<br>')}</p>
      <p><strong>Total:</strong> ${totalFormatted}</p>
      <p><strong>ID de la sesión:</strong> ${data.id || ''}</p>
    `;

    if (!process.env.RESEND_API_KEY) {
      console.error('Falta la variable de entorno RESEND_API_KEY en Vercel');
      res.status(200).json({ received: true, error: 'RESEND_API_KEY missing' });
      return;
    }

    // Resend está pensado para que un servidor mande correos (a diferencia de FormSubmit,
    // que espera un envío real desde un navegador y bloquea los pedidos de servidor).
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'David Artavia Art <onboarding@resend.dev>',
        to: ['estudioarte.da@gmail.com'],
        subject: `🎨 Nueva venta — ${totalFormatted}`,
        html: emailHtml,
      }),
    });

    const emailResultText = await emailResponse.text();
    if (!emailResponse.ok) {
      console.error('Error enviando el correo de notificación de venta. Respuesta de Resend:', emailResultText);
    } else {
      console.log('Correo de venta enviado. Respuesta de Resend:', emailResultText);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error procesando webhook de OnvoPay:', err);
    // Igual respondemos 200 para que OnvoPay no siga reintentando indefinidamente
    res.status(200).json({ received: true, error: 'internal error logged' });
  }
};
