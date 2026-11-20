import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Platform,
  AppState,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AdminUser, DEFAULT_API_URL, mobileApi } from './src/services/api';
import { clearPushRegistration, setupPushNotifications } from './src/services/push';
import {
  InAppNotification,
  OrderNotificationBanner,
} from './src/components/OrderNotificationBanner';
import { LoginScreen } from './src/screens/LoginScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';

type Tab = 'orders' | 'analytics';

function MainApp() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [tab, setTab] = useState<Tab>('orders');
  const [banner, setBanner] = useState<InAppNotification | null>(null);
  const [ordersReloadKey, setOrdersReloadKey] = useState(0);
  const knownOrderIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    mobileApi
      .init()
      .then((res) => {
        setApiUrl(res.apiUrl);
        if (res.token && res.user) setUser(res.user);
      })
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!user) {
      knownOrderIdsRef.current = null;
      return;
    }

    // Android: nhận push FCM realtime
    let cleanup: (() => void) | undefined;
    setupPushNotifications((payload) => {
      setBanner({
        id: Date.now(),
        title: payload.title,
        body: payload.body,
        orderCode: payload.orderCode,
      });
      setOrdersReloadKey((k) => k + 1);
    }).then((fn) => {
      cleanup = fn;
    });

    // iOS (.ipa miễn phí không có APNs): kiểm tra đơn mới ngay khi mở app & mỗi 5 giây khi đang mở
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let iosAppStateSub: { remove: () => void } | undefined;
    if (Platform.OS === 'ios') {
      const checkNewOrders = async () => {
        if (AppState.currentState !== 'active') return;
        try {
          const orders = await mobileApi.getOrders('all');
          if (!knownOrderIdsRef.current) {
            knownOrderIdsRef.current = new Set(orders.map((o) => o.id));
            return;
          }
          const newOrder = orders.find((o) => !knownOrderIdsRef.current!.has(o.id));
          if (newOrder) {
            orders.forEach((o) => knownOrderIdsRef.current!.add(o.id));
            setBanner({
              id: Date.now(),
              title: `🛒 Đơn hàng mới #${newOrder.orderCode}`,
              body: `${newOrder.customerName} (${newOrder.customerPhone}) • ${Math.round(
                newOrder.totalAmount
              ).toLocaleString('vi-VN')}đ`,
              orderCode: newOrder.orderCode,
            });
            setOrdersReloadKey((k) => k + 1);
          }
        } catch {
          // Bỏ qua lỗi mạng tạm thời
        }
      };
      checkNewOrders();
      pollTimer = setInterval(checkNewOrders, 5_000);
      iosAppStateSub = AppState.addEventListener('change', (state) => {
        if (state === 'active') checkNewOrders();
      });
    }

    return () => {
      cleanup?.();
      if (pollTimer) clearInterval(pollTimer);
      iosAppStateSub?.remove();
    };
  }, [user]);

  useEffect(() => {
    if (booting) return;
    const screenPath = user ? `/app/${tab}` : '/app/login';
    mobileApi.sendMobileTrack('page_view', screenPath, `Mobile: ${screenPath}`, user);

    const hbTimer = setInterval(() => {
      if (AppState.currentState === 'active') {
        mobileApi.sendMobileHeartbeat(screenPath, user);
      }
    }, 60_000);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        mobileApi.sendMobileHeartbeat(screenPath, user);
      }
    });

    return () => {
      clearInterval(hbTimer);
      appStateSub.remove();
    };
  }, [booting, user, tab]);

  const handleLogout = async () => {
    await clearPushRegistration();
    await mobileApi.logout();
    setUser(null);
  };

  if (booting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8c4a16" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen initialApiUrl={apiUrl} onLoginSuccess={setUser} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Image source={require('./src/assets/logo.png')} style={styles.headerLogo} />
          <View>
            <Text style={styles.headerTitle}>ĐIỀU NHÀ ADMIN</Text>
            <Text style={styles.headerSub}>{user.email}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Active Screen */}
      <View style={styles.content}>
        <OrderNotificationBanner
          notification={banner}
          onPress={() => {
            setTab('orders');
            setOrdersReloadKey((k) => k + 1);
          }}
          onDismiss={() => setBanner(null)}
        />
        {tab === 'orders' ? (
          <OrdersScreen key={ordersReloadKey} />
        ) : (
          <AnalyticsScreen />
        )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'orders' && styles.tabBtnActive]}
          onPress={() => setTab('orders')}
        >
          <Text style={[styles.tabText, tab === 'orders' && styles.tabTextActive]}>
            Đơn hàng
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'analytics' && styles.tabBtnActive]}
          onPress={() => setTab('analytics')}
        >
          <Text style={[styles.tabText, tab === 'analytics' && styles.tabTextActive]}>
            Giám sát & Log
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf8f5' },
  safeArea: { flex: 1, backgroundColor: '#1c1310' },
  header: {
    backgroundColor: '#1c1310',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 34, height: 34, borderRadius: 17 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  headerSub: { color: '#a8a29e', fontSize: 11, marginTop: 2 },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  logoutText: { color: '#fca5a5', fontSize: 12, fontWeight: '700' },
  content: { flex: 1, backgroundColor: '#faf8f5' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e7e5e4',
    padding: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f4',
  },
  tabBtnActive: { backgroundColor: '#8c4a16' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#57534e' },
  tabTextActive: { color: '#fff' },
});
