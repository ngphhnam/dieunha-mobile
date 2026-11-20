import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { AdminUser, mobileApi } from '../services/api';

interface Props {
  initialApiUrl: string;
  onLoginSuccess: (user: AdminUser) => void;
}

export function LoginScreen({ initialApiUrl, onLoginSuccess }: Props) {
  const [apiUrl, setApiUrl] = useState(initialApiUrl);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await mobileApi.setApiUrl(apiUrl);
      const res = await mobileApi.login(email, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.message || 'Đăng nhập thất bại.');
      }
    } catch (err: any) {
      setError(`Không thể kết nối server (${mobileApi.getApiUrl()}): ${err?.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <Text style={styles.brand}>ĐIỀU NHÀ</Text>
          <Text style={styles.subtitle}>Quản trị cửa hàng (Mobile)</Text>

          {error ? <Text style={styles.errorBox}>{error}</Text> : null}

          <Text style={styles.label}>Email Quản trị</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@dieunha.vn"
            placeholderTextColor="#a8a29e"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#a8a29e"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Đăng Nhập</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowServerConfig((v) => !v)}
          >
            <Text style={styles.configToggleText}>
              {showServerConfig ? 'Ẩn cấu hình API Server ▲' : 'Cấu hình API Server ▼'}
            </Text>
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.configBox}>
              <Text style={styles.label}>Backend API URL</Text>
              <TextInput
                style={styles.input}
                value={apiUrl}
                onChangeText={setApiUrl}
                placeholder="https://your-backend.onrender.com/api/v1"
                placeholderTextColor="#a8a29e"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.hint}>
                Local Emulator: http://10.0.2.2:5000/api/v1{'\n'}
                Production: dán link Render của bạn (kết thúc bằng /api/v1)
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignSelf: 'center',
    marginBottom: 12,
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: '#8c4a16',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#78716c',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  label: { fontSize: 12, fontWeight: '600', color: '#44403c', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#fafaf9',
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1c1917',
  },
  button: {
    backgroundColor: '#8c4a16',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    color: '#b91c1c',
    padding: 10,
    borderRadius: 10,
    fontSize: 12,
    marginBottom: 8,
  },
  configToggle: { marginTop: 16, alignItems: 'center' },
  configToggleText: { fontSize: 12, color: '#78716c', fontWeight: '600' },
  configBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f5f5f4' },
  hint: { fontSize: 11, color: '#78716c', marginTop: 6, lineHeight: 16 },
});
