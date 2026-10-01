export interface IPaymentGateway {
  createCustomer(email: string, name?: string): Promise<string>;
  createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string): Promise<{ sessionId: string; url: string }>;
  createCustomerPortal(customerId: string, returnUrl: string): Promise<string>;
}
