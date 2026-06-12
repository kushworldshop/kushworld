export {};

declare global {
  interface AcceptOpaqueData {
    dataDescriptor: string;
    dataValue: string;
  }

  interface AcceptResponse {
    opaqueData?: AcceptOpaqueData;
    messages: {
      resultCode: 'Ok' | 'Error';
      message: Array<{ code: string; text: string }>;
    };
  }

  interface Window {
    Accept?: {
      dispatchData: (
        secureData: {
          authData: { clientKey: string; apiLoginID: string };
          cardData: {
            cardNumber: string;
            month: string;
            year: string;
            cardCode: string;
          };
        },
        callback: (response: AcceptResponse) => void
      ) => void;
    };
  }
}