const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function formatEuro(cents) {
  return `€${(cents / 100).toFixed(2)}`;
}

function logSplitConfig({ totalCents, applicationFee, destination }) {
  const kateShare = totalCents - applicationFee;

  console.log('SPLIT CONFIGURATION');
  console.log('Total charge:', formatEuro(totalCents));
  console.log('Platform fee (Iryna):', formatEuro(applicationFee));
  console.log('Kate transfer:', formatEuro(kateShare));
  console.log(
    'Split ratio:',
    `${((applicationFee / totalCents) * 100).toFixed(0)}% platform / ${((kateShare / totalCents) * 100).toFixed(0)}% Kate`
  );
  console.log('Kate account:', destination);
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan } = req.body || {};

    console.log('====================================');
    console.log('NEW CHECKOUT REQUEST');
    console.log('Selected Plan:', plan);
    console.log('Time:', new Date().toISOString());

    let priceId;
    let applicationFee;

    if (String(plan) === '150') {
      priceId = process.env.PRICE_150;
      applicationFee = 6512.5; // €60.00
    } else if (String(plan) === '350') {
      priceId = process.env.PRICE_350;
      applicationFee = 15162.5; // €140.00
    }

    if (!priceId) {
      console.log('Invalid Plan');
      return res.status(400).json({
        error: 'Invalid Plan',
      });
    }

    const price = await stripe.prices.retrieve(priceId);
    logSplitConfig({
      totalCents: price.unit_amount,
      applicationFee,
      destination: process.env.KATE_ACCOUNT_ID,
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      payment_intent_data: {
        application_fee_amount: applicationFee,

        transfer_data: {
          destination: process.env.KATE_ACCOUNT_ID,
        },
      },

      success_url:
        `${process.env.FRONTEND_URL}tarifs-backup`,

      cancel_url:
        `${process.env.FRONTEND_URL}tarifs-backup`,
    });

    console.log('Checkout Session Created');
    console.log('Session ID:', session.id);
    console.log('Session URL:', session.url);
    console.log('Payment Intent:', session.payment_intent || 'pending');
    console.log('Amount total:', session.amount_total ? formatEuro(session.amount_total) : formatEuro(price.unit_amount));
    console.log('====================================');

    return res.status(200).json({
      url: session.url,
    });
  } catch (error) {
    console.error('CREATE SESSION ERROR');
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
};
