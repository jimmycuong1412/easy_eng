/**
 * VNPay Payment Gateway Integration
 *
 * VNPay is Vietnam's leading payment gateway for domestic cards and bank transfers.
 * Docs: https://sandbox.vnpayment.vn/apis/docs/
 *
 * Related Tasks: T191 [P] Configure VNPay integration
 */

import crypto from 'crypto';
import qs from 'qs';
import logger from '../../lib/logger';

export interface VNPayConfig {
  tmnCode: string;        // Terminal/Merchant Code
  hashSecret: string;     // Secret key for HMAC SHA512
  url: string;            // Payment gateway URL
  returnUrl: string;      // Return URL after payment
  ipnUrl: string;         // IPN/Webhook URL
}

export interface VNPayPaymentRequest {
  orderId: string;
  amount: number;         // VND (no decimal)
  orderInfo: string;
  orderType: string;      // e.g., 'topup', 'billpayment', 'other'
  locale: string;         // 'vn' or 'en'
  ipAddr: string;
}

export interface VNPayPaymentResponse {
  paymentUrl: string;
  transactionId: string;
}

export interface VNPayIPNParams {
  vnp_TmnCode: string;
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_BankTranNo: string;
  vnp_CardType: string;
  vnp_OrderInfo: string;
  vnp_PayDate: string;
  vnp_ResponseCode: string;
  vnp_TmnCode: string;
  vnp_TransactionNo: string;
  vnp_TransactionStatus: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
  [key: string]: string;
}

export class VNPayService {
  private config: VNPayConfig;

  constructor(config: VNPayConfig) {
    this.config = config;
  }

  /**
   * Create payment URL for VNPay redirect flow
   */
  createPaymentUrl(request: VNPayPaymentRequest): VNPayPaymentResponse {
    try {
      const createDate = this.formatDate(new Date());
      const expireDate = this.formatDate(new Date(Date.now() + 15 * 60 * 1000)); // 15 minutes

      // Build VNPay parameters
      const vnpParams: Record<string, string> = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: this.config.tmnCode,
        vnp_Amount: (request.amount * 100).toString(), // VNPay expects amount * 100
        vnp_CreateDate: createDate,
        vnp_CurrCode: 'VND',
        vnp_IpAddr: request.ipAddr,
        vnp_Locale: request.locale,
        vnp_OrderInfo: request.orderInfo,
        vnp_OrderType: request.orderType,
        vnp_ReturnUrl: this.config.returnUrl,
        vnp_TxnRef: request.orderId,
        vnp_ExpireDate: expireDate,
      };

      // Sort parameters and create signature
      const sortedParams = this.sortObject(vnpParams);
      const signData = qs.stringify(sortedParams, { encode: false });
      const secureHash = this.createHmacSHA512(signData, this.config.hashSecret);

      // Add signature to parameters
      sortedParams.vnp_SecureHash = secureHash;

      // Build payment URL
      const paymentUrl = `${this.config.url}?${qs.stringify(sortedParams, { encode: false })}`;

      logger.info('VNPay payment URL created:', {
        orderId: request.orderId,
        amount: request.amount,
      });

      return {
        paymentUrl,
        transactionId: request.orderId,
      };
    } catch (error) {
      logger.error('Error creating VNPay payment URL:', error);
      throw new Error('Failed to create VNPay payment URL');
    }
  }

  /**
   * Verify IPN/webhook callback from VNPay
   */
  verifyIPN(params: VNPayIPNParams): boolean {
    try {
      const secureHash = params.vnp_SecureHash;
      delete params.vnp_SecureHash;
      delete params.vnp_SecureHashType;

      const sortedParams = this.sortObject(params);
      const signData = qs.stringify(sortedParams, { encode: false });
      const checkSum = this.createHmacSHA512(signData, this.config.hashSecret);

      const isValid = secureHash === checkSum;

      if (!isValid) {
        logger.warn('VNPay IPN verification failed:', {
          orderId: params.vnp_TxnRef,
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying VNPay IPN:', error);
      return false;
    }
  }

  /**
   * Check if payment was successful based on response code
   */
  isPaymentSuccessful(responseCode: string): boolean {
    return responseCode === '00'; // '00' means success
  }

  /**
   * Get error message from response code
   */
  getResponseMessage(responseCode: string): string {
    const messages: Record<string, string> = {
      '00': 'Transaction successful',
      '07': 'Transaction successful. Deducted successfully. Invalid transaction',
      '09': 'Card/account is not registered for Internet Banking',
      '10': 'Authentication information is incorrect',
      '11': 'Payment timeout',
      '12': 'Card/account is locked',
      '13': 'Invalid OTP',
      '24': 'Customer canceled transaction',
      '51': 'Insufficient account balance',
      '65': 'Daily transaction limit exceeded',
      '75': 'Payment bank is under maintenance',
      '79': 'Password entered too many times',
      '99': 'Other error',
    };

    return messages[responseCode] || 'Unknown error';
  }

  /**
   * Create HMAC SHA512 signature
   */
  private createHmacSHA512(data: string, secret: string): string {
    return crypto.createHmac('sha512', secret).update(data).digest('hex');
  }

  /**
   * Sort object keys alphabetically
   */
  private sortObject<T extends Record<string, string>>(obj: T): T {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      sorted[key] = obj[key];
    }

    return sorted as T;
  }

  /**
   * Format date for VNPay (yyyyMMddHHmmss)
   */
  private formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');

    return (
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }
}

export default VNPayService;
