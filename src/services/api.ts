import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'dieunha_admin_token';
const USER_KEY = 'dieunha_admin_user';
const API_URL_KEY = 'dieunha_api_url';
const SESSION_KEY = 'dieunha_mobile_session_id';

export const DEFAULT_API_URL = 'https://dieu-nha-api.onrender.com/api/v1';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  variantWeight: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerDistrict?: string;
  customerCity: string;
  customerNote?: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  shippingStatus: string;
  createdAt: string;
  items: OrderItem[];
}

export interface VisitorStats {
  onlineNow: number;
  totalVisits: number;
  todayVisits: number;
  totalPageViews: number;
  todayPageViews: number;
  totalEvents: number;
  uniqueIps: number;
  todayUniqueIps: number;
}

export interface ActivityLog {
  id: string;
  ip: string;
  location?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  action: string;
  category: string;
  target?: string | null;
  path: string;
  createdAt: string;
}

export interface VisitorSession {
  id: string;
  sessionId: string;
  ip: string;
  location?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  userName?: string | null;
  lastPath: string;
  pageViews: number;
  eventsCount: number;
  lastSeenAt: string;
  isOnline: boolean;
}

class MobileApiService {
  private baseUrl: string = DEFAULT_API_URL;
  private token: string | null = null;
  private sessionId: string = `mobile-${Platform.OS}-${Date.now()}`;

  async init(): Promise<{ token: string | null; user: AdminUser | null; apiUrl: string }> {
    const [savedUrl, savedToken, savedUser, savedSession] = await Promise.all([
      AsyncStorage.getItem(API_URL_KEY),
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
      AsyncStorage.getItem(SESSION_KEY),
    ]);
    if (savedUrl && !savedUrl.includes('10.0.2.2') && !savedUrl.includes('localhost')) {
      this.baseUrl = savedUrl;
    }
    if (savedToken) this.token = savedToken;
    if (savedSession) {
      this.sessionId = savedSession;
    } else {
      this.sessionId = `mobile-${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await AsyncStorage.setItem(SESSION_KEY, this.sessionId);
    }
    const user = savedUser ? (JSON.parse(savedUser) as AdminUser) : null;
    return { token: this.token, user, apiUrl: this.baseUrl };
  }

  getApiUrl(): string {
    return this.baseUrl;
  }

  async setApiUrl(url: string): Promise<void> {
    const cleaned = url.trim().replace(/\/+$/, '');
    this.baseUrl = cleaned || DEFAULT_API_URL;
    await AsyncStorage.setItem(API_URL_KEY, this.baseUrl);
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-session-id': this.sessionId,
      'x-client-agent': `DieuNhaAdmin-${Platform.OS === 'ios' ? 'iOS' : 'Android'}`,
    };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: AdminUser; message?: string }> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const json = await res.json();
    if (json?.success && json.data?.token) {
      if (json.data.user?.role !== 'ADMIN') {
        return { success: false, message: 'Tài khoản này không có quyền Quản trị viên.' };
      }
      this.token = json.data.token;
      const user: AdminUser = json.data.user;
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, this.token!),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
      ]);
      return { success: true, user };
    }
    return { success: false, message: json?.message || 'Đăng nhập thất bại.' };
  }

  async logout(): Promise<void> {
    this.token = null;
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  }

  async getOrders(status?: string): Promise<Order[]> {
    const q = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`${this.baseUrl}/orders${q}`, { headers: this.headers() });
    const json = await res.json();
    if (!json?.success) throw new Error(json?.message || 'Không thể tải đơn hàng');
    return json.data || [];
  }

  async updateOrderStatus(
    id: string,
    payload: { shippingStatus?: string; paymentStatus?: string }
  ): Promise<Order> {
    const res = await fetch(`${this.baseUrl}/orders/${id}/status`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json?.success) throw new Error(json?.message || 'Cập nhật thất bại');
    return json.data;
  }

  async getVisitorStats(): Promise<VisitorStats> {
    const res = await fetch(`${this.baseUrl}/analytics/stats`, { headers: this.headers() });
    const json = await res.json();
    if (!json?.success) throw new Error(json?.message || 'Không thể tải thống kê');
    return json.data;
  }

  async getActivityLogs(limit = 40): Promise<ActivityLog[]> {
    const res = await fetch(`${this.baseUrl}/analytics/logs?limit=${limit}`, {
      headers: this.headers(),
    });
    const json = await res.json();
    if (!json?.success) throw new Error(json?.message || 'Không thể tải log');
    return json.data || [];
  }

  async getVisitorSessions(onlineOnly = false): Promise<VisitorSession[]> {
    const res = await fetch(
      `${this.baseUrl}/analytics/sessions?limit=30&onlineOnly=${onlineOnly}`,
      { headers: this.headers() }
    );
    const json = await res.json();
    if (!json?.success) throw new Error(json?.message || 'Không thể tải phiên truy cập');
    return json.data || [];
  }

  async registerDeviceToken(token: string, platform = 'android'): Promise<void> {
    await fetch(`${this.baseUrl}/users/device-token`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ token, platform }),
    });
  }

  async unregisterDeviceToken(token: string): Promise<void> {
    await fetch(`${this.baseUrl}/users/device-token`, {
      method: 'DELETE',
      headers: this.headers(),
      body: JSON.stringify({ token }),
    });
  }

  async sendMobileTrack(
    action: string,
    path: string,
    target?: string,
    user?: AdminUser | null
  ): Promise<void> {
    await fetch(`${this.baseUrl}/analytics/track`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        sessionId: this.sessionId,
        userId: user?.id,
        userName: user?.name,
        userEmail: user?.email,
        events: [
          {
            action,
            category: action === 'page_view' ? 'navigation' : 'interaction',
            target: target || path,
            path,
          },
        ],
      }),
    }).catch(() => {});
  }

  async sendMobileHeartbeat(path: string, user?: AdminUser | null): Promise<void> {
    await fetch(`${this.baseUrl}/analytics/heartbeat`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        sessionId: this.sessionId,
        path,
        userId: user?.id,
        userName: user?.name,
        userEmail: user?.email,
      }),
    }).catch(() => {});
  }
}

export const mobileApi = new MobileApiService();
