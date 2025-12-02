import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating Chatvice subscription products...');

  const starterProduct = await stripe.products.create({
    name: 'Chatvice Starter',
    description: 'Perfect for small businesses - 500 AI conversations/month, 1 team member',
    metadata: {
      planId: 'starter',
      conversationsLimit: '500',
      supervisorsLimit: '1',
    },
  });

  const starterMonthly = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 2900,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { planId: 'starter', billingInterval: 'monthly' },
  });

  const starterAnnual = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 2400,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { planId: 'starter', billingInterval: 'annual' },
  });

  console.log(`Created Starter: ${starterProduct.id}`);
  console.log(`  Monthly: ${starterMonthly.id} ($29/mo)`);
  console.log(`  Annual: ${starterAnnual.id} ($24/mo - 16% off)`);

  const proProduct = await stripe.products.create({
    name: 'Chatvice Pro',
    description: 'For growing businesses - 5,000 AI conversations/month, 5 team members',
    metadata: {
      planId: 'pro',
      conversationsLimit: '5000',
      supervisorsLimit: '5',
    },
  });

  const proMonthly = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 7900,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { planId: 'pro', billingInterval: 'monthly' },
  });

  const proAnnual = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 6600,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { planId: 'pro', billingInterval: 'annual' },
  });

  console.log(`Created Pro: ${proProduct.id}`);
  console.log(`  Monthly: ${proMonthly.id} ($79/mo)`);
  console.log(`  Annual: ${proAnnual.id} ($66/mo - 16% off)`);

  const enterpriseProduct = await stripe.products.create({
    name: 'Chatvice Enterprise',
    description: 'For large organizations - Unlimited conversations and team members',
    metadata: {
      planId: 'enterprise',
      conversationsLimit: '-1',
      supervisorsLimit: '-1',
    },
  });

  const enterpriseMonthly = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 19900,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { planId: 'enterprise', billingInterval: 'monthly' },
  });

  const enterpriseAnnual = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 16700,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { planId: 'enterprise', billingInterval: 'annual' },
  });

  console.log(`Created Enterprise: ${enterpriseProduct.id}`);
  console.log(`  Monthly: ${enterpriseMonthly.id} ($199/mo)`);
  console.log(`  Annual: ${enterpriseAnnual.id} ($167/mo - 16% off)`);

  console.log('\nAll products created successfully!');
  console.log('\nPrice IDs to use in app:');
  console.log(JSON.stringify({
    starter: { monthly: starterMonthly.id, annual: starterAnnual.id },
    pro: { monthly: proMonthly.id, annual: proAnnual.id },
    enterprise: { monthly: enterpriseMonthly.id, annual: enterpriseAnnual.id },
  }, null, 2));
}

createProducts().catch(console.error);
