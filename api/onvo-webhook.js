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

    const emailBody = {
      _subject: `🎨 Nueva venta en davidartaviaart.vercel.app — ${totalFormatted}`,
      Cliente: customer.name || metadata.shippingName || 'No proporcionado',
      Correo: customer.email || 'No proporcionado',
      Teléfono: customer.phone || metadata.shippingPhone || 'No proporcionado',
      'Dirección de envío': metadata.shippingAddress || 'No proporcionada',
      'Ciudad / Provincia / País': metadata.shippingCity || 'No proporcionada',
      Obras: itemsList || 'No especificado',
      Total: totalFormatted,
      'ID de la sesión': data.id || '',
    };

    // Reutiliza el mismo servicio de FormSubmit ya verificado para el formulario de contacto
    const formResponse = await fetch('https://formsubmit.co/ajax/Estudioarte.da@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(emailBody),
    });

    if (!formResponse.ok) {
      console.error('Error enviando el correo de notificación de venta');
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error procesando webhook de OnvoPay:', err);
    // Igual respondemos 200 para que OnvoPay no siga reintentando indefinidamente
    res.status(200).json({ received: true, error: 'internal error logged' });
  }
};
