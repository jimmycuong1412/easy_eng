/**
 * ZaloPay Payment Gateway Integration
 *
 * ZaloPay is a leading mobile wallet in Vietnam (part of VNG Corporation).
 * Docs: https://docs.zalopay.vn/
 *
 * Related Tasks: T193 [P] Configure ZaloPay integration
 */

import crypto from 'crypto';
import logger from '../../lib/logger';

export interface ZaloPayConfig {
  appId: string;
  key1: string;
  key2: string;
  endpoint: string;
  callbackUrl: string;
}

export interface ZaloPayPaymentRequest {
  orderId: string;
  amount: number;
  description: string;
  embedData?: Record<string, any>;
  bankCode?: string;
}

export interface ZaloPayPaymentResponse {
  orderUrl: string;
  zpTransToken: string;
  transactionId: string;
}

export interface ZaloPayCallbackData {
  data: string;
  mac: string;
}

export interface ZaloPayCallbackDataContent {
  app_id: number;
  app_trans_id: string;
  app_time: number;
  app_user: string;
  amount: number;
  embed_data: string;
  item: string;
  zp_trans_id: number;
  server_time: number;
  channel: number;
  merchant_user_id: string;
  user_fee_amount: number;
  discount_amount: number;
}

export class ZaloPayService {
  private config: ZaloPayConfig;

  constructor(config: ZaloPayConfig) {
    this.config = config;
  }

  /**
   * Create payment order
   */
  async createOrder(request: ZaloPayPaymentRequest): Promise<ZaloPayPaymentResponse> {
    try {
      const transId = `${Date.now()}_${request.orderId}`;
      const appTime = Date.now();
      const embedData = JSON.stringify(request.embedData || {});
      const items = JSON.stringify([
        {
          itemid: request.orderId,
          itemname: request.description,
          itemprice: request.amount,
          itemquantity: 1,
        },
      ]);

      // Create MAC signature
      const data = `${this.config.appId}|${transId}|${request.amount}|${request.description}|${appTime}|${embedData}|${items}`;
      const mac = this.createHmacSHA256(data, this.config.key1);

      // Build order payload
      const orderPayload = {
        app_id: this.config.appId,
        app_user: 'student',
        app_time: appTime,
        app_trans_id: transId,
        amount: request.amount,
        item: items,
        description: request.description,
        embed_data: embedData,
        bank_code: request.bankCode || '',
        mac,
        callback_url: this.config.callbackUrl,
      };

      logger.info('ZaloPay order created:', {
        orderId: request.orderId,
        amount: request.amount,
      });

      // Send request to ZaloPay
      const formData = new URLSearchParams();
      Object.entries(orderPayload).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      const response = await fetch(`${this.config.endpoint}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const result = await response.json();

      if (result.return_code !== 1) {
        throw new Error(`ZaloPay API error: ${result.return_message}`);
      }

      return {
        orderUrl: result.order_url,
        zpTransToken: result.zp_trans_token,
        transactionId: transId,
      };
    } catch (error) {
      logger.error('Error creating ZaloPay order:', error);
      throw new Error('Failed to create ZaloPay order');
    }
  }

  /**
   * Verify callback/IPN from ZaloPay
   */
  verifyCallback(callbackData: ZaloPayCallbackData): {
    isValid: boolean;
    data?: ZaloPayCallbackDataContent;
  } {
    try {
      const { data, mac } = callbackData;

      // Verify MAC signature
      const expectedMac = this.createHmacSHA256(data, this.config.key2);
      const isValid = mac === expectedMac;

      if (!isValid) {
        logger.warn('ZaloPay callback verification failed');
        return { isValid: false };
      }

      // Parse data
      const parsedData: ZaloPayCallbackDataContent = JSON.parse(data);

      return {
        isValid: true,
        data: parsedData,
      };
    } catch (error) {
      logger.error('Error verifying ZaloPay callback:', error);
      return { isValid: false };
    }
  }

  /**
   * Query order status
   */
  async queryOrder(appTransId: string): Promise<any> {
    try {
      const data = `${this.config.appId}|${appTransId}|${this.config.key1}`;
      const mac = this.createHmacSHA256(data, this.config.key1);

      const params = new URLSearchParams({
        app_id: this.config.appId,
        app_trans_id: appTransId,
        mac,
      });

      const response = await fetch(`${this.config.endpoint}/query?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const result = await response.json();

      return result;
    } catch (error) {
      logger.error('Error querying ZaloPay order:', error);
      throw new Error('Failed to query ZaloPay order');
    }
  }

  /**
   * Get refund status
   */
  async refund(zpTransId: string, amount: number, description: string): Promise<any> {
    try {
      const timestamp = Date.now();
      const mRefundId = `${timestamp}_${zpTransId}`;

      const data = `${this.config.appId}|${zpTransId}|${amount}|${description}|${timestamp}`;
      const mac = this.createHmacSHA256(data, this.config.key1);

      const refundPayload = {
        app_id: this.config.appId,
        m_refund_id: mRefundId,
        zp_trans_id: zpTransId,
        amount,
        description,
        timestamp,
        mac,
      };

      const formData = new URLSearchParams();
      Object.entries(refundPayload).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      const response = await fetch(`${this.config.endpoint}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      return await response.json();
    } catch (error) {
      logger.error('Error processing ZaloPay refund:', error);
      throw new Error('Failed to process ZaloPay refund');
    }
  }

  /**
   * Get return message from return code
   */
  getReturnMessage(returnCode: number): string {
    const messages: Record<number, string> = {
      1: 'Success',
      2: 'Failed',
      3: 'Pending (waiting for user payment)',
      '-1': 'Invalid parameters',
      '-2': 'Invalid MAC',
      '-3': 'Invalid app_id',
      '-4': 'Invalid amount',
      '-5': 'Invalid bank_code',
      '-6': 'Invalid transaction',
      '-7': 'Timeout',
      '-8': 'Transaction does not exist',
      '-9': 'Transaction has been processed',
      '-49': 'Failed (other reason)',
    };

    return messages[returnCode] || 'Unknown status';
  }

  /**
   * Create HMAC SHA256 signature
   */
  private createHmacSHA256(data: string, key: string): string {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }
}

export default ZaloPayService;
