import { 
  CreateSessionPayload, 
  PaymentSession, 
  PaymentProgress, 
  QRParseResult 
} from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const errorData = await res.json();
      errorDetail = errorData.detail || errorData.message || errorDetail;
    } catch {
      errorDetail = `Request failed with status ${res.status}`;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  async createSession(payload: CreateSessionPayload): Promise<PaymentSession> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<PaymentSession>(res);
  },

  async getSession(sessionId: string): Promise<PaymentSession> {
    const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}`);
    return handleResponse<PaymentSession>(res);
  },

  async markPaymentOpened(sessionId: string, paymentId: string): Promise<PaymentSession> {
    const res = await fetch(
      `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/payments/${encodeURIComponent(paymentId)}/open`,
      { method: 'POST' }
    );
    return handleResponse<PaymentSession>(res);
  },

  async userConfirmPayment(sessionId: string, paymentId: string): Promise<PaymentSession> {
    const res = await fetch(
      `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/payments/${encodeURIComponent(paymentId)}/user-confirm`,
      { method: 'POST' }
    );
    return handleResponse<PaymentSession>(res);
  },

  async getProgress(sessionId: string): Promise<PaymentProgress> {
    const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/progress`);
    return handleResponse<PaymentProgress>(res);
  },

  async mockVerifyPayment(paymentId: string, simulatedStatus: string = 'SUCCESS'): Promise<PaymentSession> {
    const res = await fetch(
      `${API_BASE}/mock/payments/${encodeURIComponent(paymentId)}/verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulated_status: simulatedStatus }),
      }
    );
    return handleResponse<PaymentSession>(res);
  },

  async parseQR(qrString: string): Promise<QRParseResult> {
    const res = await fetch(`${API_BASE}/sessions/parse-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_string: qrString }),
    });
    return handleResponse<QRParseResult>(res);
  }
};
