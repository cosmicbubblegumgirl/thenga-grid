export type InterledgerStage = 'wallet' | 'incoming' | 'quote' | 'consent' | 'outgoing';

export type InterledgerReceipt = {
  mode: 'local_test';
  method: 'ilp';
  assetCode: 'ZAR';
  assetScale: 2;
  amount: string;
  senderWalletAddress: string;
  receiverWalletAddress: string;
  incomingPaymentId: string;
  quoteId: string;
  outgoingPaymentId: string;
  completedAt: string;
};

const RECEIVER_WALLET = 'https://wallet.interledger-test.dev/thenga-grid-demo';
const STAGES: InterledgerStage[] = ['wallet', 'incoming', 'quote', 'consent', 'outgoing'];
const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function runLocalInterledgerPayment(
  input: { amountCents: number; reference: string; senderWalletAddress: string },
  onStage: (stage: InterledgerStage) => void,
): Promise<InterledgerReceipt> {
  const wallet = input.senderWalletAddress.trim();
  if (!/^https:\/\/[^\s/]+\/.+/.test(wallet)) throw new Error('Enter a valid HTTPS wallet address.');
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error('Payment amount is invalid.');

  for (const stage of STAGES) {
    onStage(stage);
    await pause(360);
  }

  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    mode: 'local_test',
    method: 'ilp',
    assetCode: 'ZAR',
    assetScale: 2,
    amount: String(input.amountCents),
    senderWalletAddress: wallet,
    receiverWalletAddress: RECEIVER_WALLET,
    incomingPaymentId: `ilp-test:incoming:${suffix}`,
    quoteId: `ilp-test:quote:${suffix}`,
    outgoingPaymentId: `ilp-test:outgoing:${suffix}`,
    completedAt: new Date().toISOString(),
  };
}
