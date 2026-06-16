export type AuthorizeNetEnvironment = 'sandbox' | 'production';

export interface OpaqueData {
  dataDescriptor: string;
  dataValue: string;
}

export interface ChargeCustomer {
  name: string;
  email: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
}

export interface ChargeResult {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  error?: string;
}

export function getAuthorizeNetConfig() {
  const env = (process.env.AUTHORIZE_NET_ENV || 'sandbox') as AuthorizeNetEnvironment;
  const apiLoginId = process.env.AUTHORIZE_NET_API_LOGIN_ID || '';
  const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY || '';
  const clientKey =
    process.env.NEXT_PUBLIC_AUTHORIZE_NET_CLIENT_KEY ||
    process.env.AUTHORIZE_NET_CLIENT_KEY ||
    '';

  return {
    env,
    apiLoginId,
    transactionKey,
    clientKey,
    apiUrl:
      env === 'production'
        ? 'https://api.authorize.net/xml/v1/request.api'
        : 'https://apitest.authorize.net/xml/v1/request.api',
    acceptJsUrl:
      env === 'production'
        ? 'https://js.authorize.net/v1/Accept.js'
        : 'https://jstest.authorize.net/v1/Accept.js',
    isConfigured: Boolean(apiLoginId && transactionKey && clientKey),
  };
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || 'Customer',
    lastName: parts.slice(1).join(' ') || 'Customer',
  };
}

export async function chargeCard(
  amount: number,
  opaqueData: OpaqueData,
  customer: ChargeCustomer,
  orderId: string
): Promise<ChargeResult> {
  const config = getAuthorizeNetConfig();

  if (!config.isConfigured) {
    return { success: false, error: 'Authorize.net is not configured' };
  }

  const { firstName, lastName } = splitName(customer.name);

  const payload = {
    createTransactionRequest: {
      merchantAuthentication: {
        name: config.apiLoginId,
        transactionKey: config.transactionKey,
      },
      refId: orderId,
      transactionRequest: {
        transactionType: 'authCaptureTransaction',
        amount: amount.toFixed(2),
        payment: {
          opaqueData: {
            dataDescriptor: opaqueData.dataDescriptor,
            dataValue: opaqueData.dataValue,
          },
        },
        order: {
          invoiceNumber: orderId,
          description: `KushWorld Order ${orderId}`,
        },
        billTo: {
          firstName,
          lastName,
          address: customer.address,
          address2: customer.address2,
          city: customer.city,
          state: customer.state,
          zip: customer.zip,
          country: 'US',
          phoneNumber: customer.phone || undefined,
          email: customer.email,
        },
        customer: {
          email: customer.email,
        },
      },
    },
  };

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  const transactionResponse = result.transactionResponse;
  const messages = result.messages;

  if (transactionResponse?.responseCode === '1') {
    return {
      success: true,
      transactionId: transactionResponse.transId,
      authCode: transactionResponse.authCode,
    };
  }

  const errorMessage =
    transactionResponse?.errors?.[0]?.errorText ||
    messages?.message?.[0]?.text ||
    'Payment was declined. Please check your card details and try again.';

  return { success: false, error: errorMessage };
}