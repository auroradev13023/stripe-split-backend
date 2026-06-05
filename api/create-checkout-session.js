const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { plan } = req.body;

    console.log('====================================');
    console.log('NEW CHECKOUT REQUEST');
    console.log('Selected Plan:', plan);
    console.log('Time:', new Date().toISOString());

    let priceId;
    let applicationFee;

    if (plan === '150') {
      priceId = process.env.PRICE_150;
      applicationFee = 6000; // €60.00
    }

    if (plan === '350') {
      priceId = process.env.PRICE_350;
      applicationFee = 14000; // €140.00
    }

    if (!priceId) {
      console.log('Invalid Plan');
      return res.status(400).json({
        error: 'Invalid Plan',
      });
    }

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

app.listen(process.env.PORT || 3000, () => {
  console.log('Server Started');
});