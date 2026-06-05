const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
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
};