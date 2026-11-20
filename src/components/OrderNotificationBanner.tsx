import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

export interface InAppNotification {
  id: number;
  title: string;
  body: string;
  orderCode?: string;
}

interface Props {
  notification: InAppNotification | null;
  onPress: () => void;
  onDismiss: () => void;
}

export function OrderNotificationBanner({ notification, onPress, onDismiss }: Props) {
  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!notification) return;

    Vibration.vibrate([0, 120, 80, 120]);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 11,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      hide();
    }, 7000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification?.id]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -160,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.card}
        onPress={() => {
          hide();
          onPress();
        }}
      >
        <Image source={require('../assets/logo.png')} style={styles.logo} />

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.liveDot} />
            <Text style={styles.appLabel}>ĐIỀU NHÀ • VỪA XONG</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
          <Text style={styles.cta}>Nhấn để xem đơn hàng →</Text>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={hide}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    zIndex: 999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1c1310',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d97706',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  appLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fbbf24',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  body: {
    fontSize: 12,
    color: '#e7e5e4',
    marginTop: 3,
    lineHeight: 17,
  },
  cta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
    marginTop: 6,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: '#a8a29e',
    fontSize: 14,
    fontWeight: '700',
  },
});
