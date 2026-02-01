/**
 * MoMo Payment Gateway Integration
 *
 * MoMo is Vietnam's leading mobile wallet and payment platform.
 * Docs: https://developers.momo.vn/
 *
 * Related Tasks: T192 [P] Configure MoMo integration
 */

import crypto from 'crypto';
import logger from '../../lib/logger';

export interface MoMoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
  redirectUrl: string;
  ipnUrl: string;
}

export interface MoMoPaymentRequest {
  orderId: string;
  amount: number;
  orderInfo: string;
  requestId: string;
  extraData?: string;
}

export interface MoMoPaymentResponse {
  payUrl: string;
  deeplink: string;
  qrCodeUrl: string;
  transactionId: string;
}

export interface MoMoIPNData {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: string;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: string;
  extraData: string;
  signature: string;
}

export class MoMoService {
  private config: MoMoConfig;

  constructor(config: MoMoConfig) {
    this.config = config;
  }

  /**
   * Create payment request to MoMo
   */
  async createPayment(request: MoMoPaymentRequest): Promise<MoMoPaymentResponse> {
    try {
      const requestId = request.requestId || `${Date.now()}`;
      const orderId = request.orderId;
      const amount = Math.round(request.amount);
      const orderInfo = request.orderInfo;
      const extraData = request.extraData || '';

      // Create request signature
      const rawSignature = `accessKey=${this.config.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.config.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.config.partnerCode}&redirectUrl=${this.config.redirectUrl}&requestId=${requestId}&requestType=captureWallet`;

      const signature = this.createSignature(rawSignature);

      // Build request body
      const requestBody = {
        partnerCode: this.config.partnerCode,
        partnerName: 'EasyEng Platform',
        storeId: 'EasyEngStore',
        requestId,
        amount,
        orderId,
        orderInfo,
        redirectUrl: this.config.redirectUrl,
        ipnUrl: this.config.ipnUrl,
        lang: 'vi',
        extraData,
        requestType: 'captureWallet',
        signature,
      };

      logger.info('MoMo payment request created:', {
        orderId,
        amount,
      });

      // Send request to MoMo
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.resultCode !== 0) {
        throw new Error(`MoMo API error: ${data.message}`);
      }

      return {
        payUrl: data.payUrl,
        deeplink: data.deeplink,
        qrCodeUrl: data.qrCodeUrl,
        transactionId: orderId,
      };
    } catch (error) {
      logger.error('Error creating MoMo payment:', error);
      throw new Error('Failed to create MoMo payment');
    }
  }

  /**
   * Verify IPN callback from MoMo
   */
  verifyIPN(ipnData: MoMoIPNData): boolean {
    try {
      const {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature,
      } = ipnData;

      // Recreate signature
      const rawSignature = `accessKey=${this.config.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

      const expectedSignature = this.createSignature(rawSignature);

      const isValid = signature === expectedSignature;

      if (!isValid) {
        logger.warn('MoMo IPN verification failed:', {
          orderId,
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying MoMo IPN:', error);
      return false;
    }
  }

  /**
   * Check if payment was successful
   */
  isPaymentSuccessful(resultCode: number): boolean {
    return resultCode === 0; // 0 means success
  }

  /**
   * Get error message from result code
   */
  getResultMessage(resultCode: number): string {
    const messages: Record<number, string> = {
      0: 'Successful',
      9000: 'Transaction confirmed successfully',
      8000: 'Transaction is being processed',
      7000: 'Transaction is pending (waiting for user confirmation)',
      1000: 'Transaction has been initiated, waiting for customer confirmation',
      11: 'Access denied',
      12: 'MoMo API version not supported',
      13: 'Merchant authentication failed',
      20: 'Invalid amount',
      21: 'Invalid amount (too small)',
      22: 'Invalid amount (too large)',
      40: 'Request ID not found',
      41: 'Order ID not found',
      42: 'Order ID already exists',
      43: 'Signature verification failed',
      1001: 'Transaction failed',
      1002: 'Transaction rejected by issuer',
      1003: 'Payment was cancelled',
      1004: 'Transaction failed - timeout',
      1005: 'Transaction failed - incorrect URL/params',
      1006: 'Transaction failed - wrong OTP/transaction password',
      1007: 'Transaction declined by customer',
      2001: 'Transaction failed - insufficient balance',
      2007: 'Transaction exceeds amount limit per transaction',
      4001: 'Transaction failed (MoMo side)',
      4100: 'Customer account is in the suspension list',
    };

    return messages[resultCode] || 'Unknown error';
  }

  /**
   * Query transaction status
   */
  async queryTransaction(orderId: string, requestId: string): Promise<any> {
    try {
      const rawSignature = `accessKey=${this.config.accessKey}&orderId=${orderId}&partnerCode=${this.config.partnerCode}&requestId=${requestId}`;

      const signature = this.createSignature(rawSignature);

      const requestBody = {
        partnerCode: this.config.partnerCode,
        requestId,
        orderId,
        signature,
        lang: 'vi',
      };

      const response = await fetch(`${this.config.endpoint}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      return await response.json();
    } catch (error) {
      logger.error('Error querying MoMo transaction:', error);
      throw new Error('Failed to query MoMo transaction');
    }
  }

  /**
   * Create HMAC SHA256 signature
   */
  private createSignature(data: string): string {
    return crypto.createHmac('sha256', this.config.secretKey).update(data).digest('hex');
  }
}

export default MoMoService;
