export type PaddlePriceDetails = {
  id: string;
  amount: string;
  currencyCode: string;
  formattedAmount: string;
  interval: string;
  frequency: number;
};

export type PaddlePriceIds = {
  monthlyPriceId: string;
  yearlyPriceId: string;
};

type PaddlePriceResponse = {
  data?: {
    id?: string;
    unit_price?: {
      amount?: string;
      currency_code?: string;
    };
    billing_cycle?: {
      interval?: string;
      frequency?: number;
    } | null;
    status?: string;
  };
};

export type PricingDisplayPrice = {
  amount: string;
  minorAmount: string;
  currencyCode: string;
};

export const fallbackMonthlyDisplayPrice: PricingDisplayPrice = {
  amount: '$4',
  minorAmount: '400',
  currencyCode: 'USD',
};

export const fallbackYearlyDisplayPrice: PricingDisplayPrice = {
  amount: '$40',
  minorAmount: '4000',
  currencyCode: 'USD',
};

export function getCountryCodeFromHeaders(headers: Headers) {
  return headers.get('x-vercel-ip-country')?.toUpperCase() || null;
}

export function getPaddlePriceIdsForCountry(countryCode: string | null): PaddlePriceIds {
  const isKorea = countryCode === 'KR';
  const monthlyPriceId = isKorea
    ? process.env.NEXT_PUBLIC_PADDLE_PRICE_KO_MONTHLY || process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY || ''
    : process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY || '';
  const yearlyPriceId = isKorea
    ? process.env.NEXT_PUBLIC_PADDLE_PRICE_KO_YEARLY || process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY || ''
    : process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY || '';

  return {
    monthlyPriceId,
    yearlyPriceId,
  };
}

export function isMonthlyPaddlePriceId(priceId: string | null) {
  return Boolean(priceId) && [
    process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY,
    process.env.NEXT_PUBLIC_PADDLE_PRICE_KO_MONTHLY,
  ].includes(priceId || undefined);
}

export function isYearlyPaddlePriceId(priceId: string | null) {
  return Boolean(priceId) && [
    process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY,
    process.env.NEXT_PUBLIC_PADDLE_PRICE_KO_YEARLY,
  ].includes(priceId || undefined);
}

function getPaddleApiConfig() {
  const apiKey = process.env.PADDLE_API_KEY;
  const isSandbox = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox';

  if (!apiKey) {
    throw new Error('PADDLE_API_KEY is not configured.');
  }

  return {
    apiBaseUrl: isSandbox ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Paddle-Version': '1',
    },
  };
}

function getCurrencyFractionDigits(currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function formatPaddleAmount(amount: string, currencyCode: string) {
  const numericAmount = Number.parseInt(amount, 10);
  if (!Number.isFinite(numericAmount)) {
    throw new Error(`Invalid Paddle price amount: ${amount}`);
  }

  const fractionDigits = getCurrencyFractionDigits(currencyCode);
  const majorAmount = numericAmount / 10 ** fractionDigits;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: Number.isInteger(majorAmount) ? 0 : fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(majorAmount);
}

export async function getActivePaddlePrice(priceId: string): Promise<PaddlePriceDetails> {
  if (!priceId) {
    throw new Error('Paddle price ID is not configured.');
  }

  const config = getPaddleApiConfig();
  const response = await fetch(`${config.apiBaseUrl}/prices/${priceId}`, {
    headers: config.headers,
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null) as PaddlePriceResponse | null;
  const price = result?.data;

  if (
    !response.ok ||
    price?.status !== 'active' ||
    !price.id ||
    !price.unit_price?.amount ||
    !price.unit_price.currency_code ||
    !price.billing_cycle?.interval ||
    !price.billing_cycle.frequency
  ) {
    throw new Error(`Could not load active Paddle price: ${priceId}`);
  }

  return {
    id: price.id,
    amount: price.unit_price.amount,
    currencyCode: price.unit_price.currency_code,
    formattedAmount: formatPaddleAmount(price.unit_price.amount, price.unit_price.currency_code),
    interval: price.billing_cycle.interval,
    frequency: price.billing_cycle.frequency,
  };
}

export async function getPricingDisplayPrices({
  monthlyPriceId,
  yearlyPriceId,
}: {
  monthlyPriceId: string;
  yearlyPriceId: string;
}) {
  try {
    const [monthly, yearly] = await Promise.all([
      getActivePaddlePrice(monthlyPriceId),
      getActivePaddlePrice(yearlyPriceId),
    ]);

    return {
      monthlyPrice: {
        amount: monthly.formattedAmount,
        minorAmount: monthly.amount,
        currencyCode: monthly.currencyCode,
      },
      yearlyPrice: {
        amount: yearly.formattedAmount,
        minorAmount: yearly.amount,
        currencyCode: yearly.currencyCode,
      },
    };
  } catch (error) {
    console.error('Could not load Paddle prices for pricing page:', error);
    return {
      monthlyPrice: fallbackMonthlyDisplayPrice,
      yearlyPrice: fallbackYearlyDisplayPrice,
    };
  }
}
