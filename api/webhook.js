const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function formatEuro(cents, currency = 'eur') {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function logSplitFromPaymentIntent(paymentIntent) {
  const total = paymentIntent.amount;
  const platformFee = paymentIntent.application_fee_amount || 0;
  const kateShare = total - platformFee;
  const currency = paymentIntent.currency || 'eur';

  console.log('PAYMENT SPLIT');
  console.log('Total charged:', formatEuro(total, currency));
  console.log('Platform fee (Iryna):', formatEuro(platformFee, currency));
  console.log('Kate transfer:', formatEuro(kateShare, currency));
  console.log(
    'Split ratio:',
    `${((platformFee / total) * 100).toFixed(0)}% platform / ${((kateShare / total) * 100).toFixed(0)}% Kate`
  );
  console.log('Kate account:', paymentIntent.transfer_data?.destination || 'N/A');
}

async function logConfirmedSplit(paymentIntentId) {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge'],
  });

  logSplitFromPaymentIntent(paymentIntent);

  const charge = paymentIntent.latest_charge;
  if (charge && typeof charge === 'object') {
    console.log('Charge ID:', charge.id);
    if (charge.transfer) {
      console.log('Transfer ID:', charge.transfer);
    }
    if (charge.application_fee) {
      console.log('Application fee ID:', charge.application_fee);
    }
  }
}

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

      if (session.payment_intent) {
        await logConfirmedSplit(session.payment_intent);
      }

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
      logSplitFromPaymentIntent(paymentIntent);

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
