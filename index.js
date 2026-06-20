const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const TVA_DESCRIPTION = 'TVA non applicable, art. 293 B du CGI';

const PLANS = {
  '150': {
    unitAmount: 15000,
    applicationFee: 6513,
    productName: '150€ TTC',
  },
  '350': {
    unitAmount: 35000,
    applicationFee: 15163,
    productName: '350€ TTC',
  },
};

app.use(cors());
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { plan } = req.body;

    console.log('====================================');
    console.log('NEW CHECKOUT REQUEST');
    console.log('Selected Plan:', plan);
    console.log('Time:', new Date().toISOString());

    const selectedPlan = PLANS[String(plan)];

    if (!selectedPlan) {
      console.log('Invalid Plan');
      return res.status(400).json({
        error: 'Invalid Plan',
      });
    }

    const { unitAmount, applicationFee, productName } = selectedPlan;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',

      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: unitAmount,
            product_data: {
              name: productName,
              description: TVA_DESCRIPTION,
            },
          },
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
        `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${process.env.FRONTEND_URL}/cancel`,
    });

    console.log('Checkout Session Created');
    console.log('Session ID:', session.id);
    console.log('Session URL:', session.url);
    console.log('Kate Account:', process.env.KATE_ACCOUNT_ID);
    console.log('====================================');

    return res.json({
      url: session.url,
    });
  } catch (error) {
    console.error('CREATE SESSION ERROR');
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

app.post('/wehbook', async (req, res) => {
  const event = req.body;

  console.log('====================================');
  console.log('WEBHOOK EVENT');
  console.log('Type:', event.type);
  console.log('Time:', new Date().toISOString());

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      console.log('PAYMENT SUCCESS');
      console.log('Session ID:', session.id);
      console.log('Customer Email:', session.customer_details?.email);
      console.log('Amount:', session.amount_total / 100);
      console.log('Currency:', session.currency);
      console.log('Payment Status:', session.payment_status);
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object;

      console.log('PAYMENT FAILED');
      console.log('Session ID:', session.id);
      console.log('Amount:', session.amount_total / 100);
      console.log('Currency:', session.currency);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;

      console.log('PAYMENT INTENT SUCCEEDED');
      console.log('Payment Intent:', paymentIntent.id);
      console.log('Amount:', paymentIntent.amount / 100);
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;

      console.log('PAYMENT INTENT FAILED');
      console.log('Payment Intent:', paymentIntent.id);
    }

    console.log('====================================');

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error('WEBHOOK ERROR');
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = app;
