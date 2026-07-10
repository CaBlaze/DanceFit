// ── DANCEFIT STUDIO - SERVIDOR BACKEND EXPRESS Y MERCADO PAGO ──
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Middlewares
app.use(cors());
app.use(express.json());

// Inicialización de clientes
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

// ── RUTA 1: VERIFICAR CONEXIÓN CON SUPABASE ──
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase.from('classes').select('count', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ success: true, message: 'Conexión a Supabase exitosa', count: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── RUTA DE DIAGNÓSTICO DE SALUD Y CONFIGURACIÓN ──
app.get('/api/health', (req, res) => {
  const token = process.env.MP_ACCESS_TOKEN || '';
  const tokenPrefix = token.substring(0, 12);
  const isProd = token.startsWith('APP_USR');
  
  res.json({
    success: true,
    message: 'Backend de DanceFit activo',
    tokenPrefix: tokenPrefix + '...',
    isProdToken: isProd,
    originReceived: req.headers.origin || 'none'
  });
});

// ── RUTA 2: CREAR PREFERENCIA DE PAGO (CHECKOUT PRO) ──
app.post('/api/create-preference', async (req, res) => {
  const { classId, className, price, spotNumber, profileId } = req.body;
  let origin = req.headers.origin || 'http://localhost:8000';
  if (origin === 'null' || !origin.startsWith('http')) {
    origin = 'http://127.0.0.1:5500';
  }

  // En producción (token APP_USR), Mercado Pago exige obligatoriamente redireccionamientos HTTPS.
  // Si probamos en local (http://localhost o http://127.0.0.1), forzamos un retorno seguro al dominio de producción.
  const isProdToken = process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN.startsWith('APP_USR');
  const baseOrigin = (isProdToken && !origin.startsWith('https'))
    ? 'https://cablaze.github.io/DanceFit'
    : origin;

  try {
    const preference = new Preference(mpClient);
    
    // Crear la preferencia de Mercado Pago
    const result = await preference.create({
      body: {
        items: [
          {
            id: classId,
            title: `DanceFit: ${className} (Spot #${spotNumber})`,
            quantity: 1,
            unit_price: Number(price),
            currency_id: 'PEN' // Soles peruanos
          }
        ],
        back_urls: {
          success: `${baseOrigin}/index.html?payment=success&classId=${classId}&spot=${spotNumber}&profileId=${profileId}`,
          failure: `${baseOrigin}/index.html?payment=failure`,
          pending: `${baseOrigin}/index.html?payment=pending`
        },
        auto_return: 'approved',
        // metadata guarda los datos clave para insertarlos tras el cobro
        metadata: {
          profile_id: profileId,
          class_id: classId,
          spot_number: spotNumber
        }
      }
    });

    res.json({
      success: true,
      preferenceId: result.id,
      initPoint: result.init_point // Link de redirección al checkout
    });
  } catch (err) {
    console.error('Error al crear preferencia de Mercado Pago:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── RUTA 3: CONFIRMACIÓN DIRECTA (FALLBACK LOCAL PARA PRUEBAS) ──
app.post('/api/confirm-payment', async (req, res) => {
  const { profileId, classId, spotNumber, paymentId } = req.body;

  try {
    // Validar si ya existe una reserva idéntica para evitar duplicaciones
    const { data: existing } = await supabase
      .from('reservations')
      .select('id')
      .eq('class_id', classId)
      .eq('spot_number', Number(spotNumber))
      .eq('status', 'confirmed');

    if (existing && existing.length > 0) {
      return res.json({ success: true, message: 'La reserva ya fue confirmada anteriormente.' });
    }

    const { data, error } = await supabase
      .from('reservations')
      .insert([
        {
          profile_id: profileId,
          class_id: classId,
          spot_number: Number(spotNumber),
          phone_yape: 'MP-ONLINE',
          code_yape: paymentId || 'MP-' + Math.floor(Math.random() * 100000),
          status: 'confirmed',
          payment_method: 'mercadopago'
        }
      ])
      .select();

    if (error) throw error;
    res.json({ success: true, reservation: data[0] });
  } catch (err) {
    console.error('Error al confirmar reserva:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── RUTA 4: WEBHOOK DE NOTIFICACIONES EN TIEMPO REAL ──
app.post('/api/webhooks/mercadopago', async (req, res) => {
  const { query } = req;
  const topic = query.topic || query.type;

  if (topic === 'payment') {
    const paymentId = query.id || query['data.id'];
    try {
      // 1. Consultar detalles del pago utilizando fetch nativo
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      });
      const payment = await response.json();

      if (payment.status === 'approved') {
        const { profile_id, class_id, spot_number } = payment.metadata;

        // Registrar reserva en Supabase
        const { data, error } = await supabase
          .from('reservations')
          .insert([
            {
              profile_id,
              class_id,
              spot_number: Number(spot_number),
              phone_yape: 'MP-WEBHOOK',
              code_yape: paymentId.toString(),
              status: 'confirmed',
              payment_method: 'mercadopago'
            }
          ])
          .select();

        if (error) {
          console.error('Error al registrar reserva mediante Webhook:', error);
        } else {
          console.log('Reserva registrada exitosamente por Webhook:', data);
        }
      }
    } catch (err) {
      console.error('Error al procesar webhook de Mercado Pago:', err);
    }
  }

  res.sendStatus(200); // Mercado Pago requiere responder siempre 200 de inmediato
});

// Inicialización del puerto
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
