export type PaymentStatus = 
  | 'CREATED' 
  | 'OPENED' 
  | 'USER_MARKED_PAID' 
  | 'VERIFIED' 
  | 'FAILED' 
  | 'EXPIRED';

export interface SplitPayment {
  payment_id: string;
  session_id: string;
  sequence: number;
  amount_paise: number;
  amount_rupees: string;
  upi_uri: string;
  transaction_ref: string;
  status: PaymentStatus;
  opened_at?: string | null;
  marked_paid_at?: string | null;
  verified_at?: string | null;
  created_at: string;
}

export interface PaymentProgress {
  session_id: string;
  total_amount_paise: number;
  total_amount_rupees: string;
  collected_verified_paise: number;
  collected_verified_rupees: string;
  collected_user_marked_paise: number;
  collected_user_marked_rupees: string;
  remaining_paise: number;
  remaining_rupees: string;
  current_payment_index: number;
  total_payments_count: number;
  verified_payments_count: number;
  marked_payments_count: number;
  invoice_status: 'PENDING' | 'PARTIALLY_PAID' | 'PENDING_VERIFICATION' | 'PAID' | string;
  is_completed: boolean;
  is_verified_complete: boolean;
}

export interface PaymentSession {
  session_id: string;
  payee_vpa: string;
  payee_name: string;
  merchant_code?: string | null;
  total_amount_paise: number;
  total_amount_rupees: string;
  currency: string;
  notes?: string | null;
  status: string;
  current_payment_index: number;
  created_at: string;
  payments: SplitPayment[];
  progress: PaymentProgress;
}

export interface CreateSessionPayload {
  payee_vpa: string;
  payee_name: string;
  total_amount_paise: number;
  merchant_code?: string | null;
  notes?: string | null;
  custom_split_paise?: number[] | null;
}

export interface QRParseResult {
  is_valid_upi: boolean;
  payee_vpa?: string | null;
  payee_name?: string | null;
  amount_paise?: number | null;
  amount_rupees?: string | null;
  currency?: string | null;
  merchant_code?: string | null;
  transaction_ref?: string | null;
  transaction_note?: string | null;
  raw_uri?: string | null;
  error_message?: string | null;
}
