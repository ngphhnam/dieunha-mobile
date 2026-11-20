import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  ActivityLog,
  mobileApi,
  VisitorSession,
  VisitorStats,
} from '../services/api';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      hour12: false,
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function AnalyticsScreen() {
  const [subTab, setSubTab] = useState<'sessions' | 'logs'>('sessions');
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [s, ses, lg] = await Promise.all([
        mobileApi.getVisitorStats(),
        mobileApi.getVisitorSessions(false),
        mobileApi.getActivityLogs(40),
      ]);
      setStats(s);
      setSessions(ses);
      setLogs(lg);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể tải dữ liệu giám sát.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <View style={styles.container}>
      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, styles.kpiOnline]}>
          <Text style={styles.kpiLabel}>Đang Online</Text>
          <Text style={[styles.kpiValue, { color: '#047857' }]}>
            {stats?.onlineNow ?? 0}
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Hôm nay / Tổng</Text>
          <Text style={styles.kpiValue}>
            {stats?.todayVisits ?? 0} / {stats?.totalVisits ?? 0}
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>IP duy nhất</Text>
          <Text style={styles.kpiValue}>{stats?.uniqueIps ?? 0}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Tổng Log</Text>
          <Text style={styles.kpiValue}>{stats?.totalEvents ?? 0}</Text>
        </View>
      </View>

      {/* Sub-tabs */}
      <View style={styles.subTabRow}>
        <TouchableOpacity
          style={[styles.subTab, subTab === 'sessions' && styles.subTabActive]}
          onPress={() => setSubTab('sessions')}
        >
          <Text style={[styles.subTabText, subTab === 'sessions' && styles.subTabTextActive]}>
            Phiên & IP ({sessions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, subTab === 'logs' && styles.subTabActive]}
          onPress={() => setSubTab('logs')}
        >
          <Text style={[styles.subTabText, subTab === 'logs' && styles.subTabTextActive]}>
            Nhật ký thao tác ({logs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'sessions' ? (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có phiên truy cập.</Text>}
          renderItem={({ item }) => (
            <View style={styles.rowCard}>
              <View style={styles.rowTop}>
                <Text style={styles.ipText}>{item.ip}</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: item.isOnline ? '#d1fae5' : '#f5f5f4' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: item.isOnline ? '#047857' : '#78716c' },
                    ]}
                  >
                    {item.isOnline ? '● Online' : 'Offline'}
                  </Text>
                </View>
              </View>
              <Text style={styles.metaText}>
                {item.device || 'Desktop'} • {item.browser || '?'} • {item.os || '?'}
              </Text>
              <Text style={styles.pathText} numberOfLines={1}>
                Trang: {item.lastPath} ({item.pageViews} xem / {item.eventsCount} log)
              </Text>
              <Text style={styles.timeText}>{formatTime(item.lastSeenAt)}</Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có log nào.</Text>}
          renderItem={({ item }) => (
            <View style={styles.rowCard}>
              <View style={styles.rowTop}>
                <Text style={styles.actionBadge}>{item.action}</Text>
                <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
              </View>
              <Text style={styles.targetText} numberOfLines={2}>
                {item.target || item.path}
              </Text>
              <Text style={styles.metaText}>
                IP: {item.ip} • {item.userName || 'Khách'} • {item.path}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  kpiOnline: { borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' },
  kpiLabel: { fontSize: 11, color: '#78716c', fontWeight: '600' },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#1c1917', marginTop: 4 },
  subTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  subTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#e7e5e4',
    alignItems: 'center',
  },
  subTabActive: { backgroundColor: '#2c1a10' },
  subTabText: { fontSize: 12, fontWeight: '700', color: '#44403c' },
  subTabTextActive: { color: '#fff' },
  listContent: { padding: 12, gap: 8 },
  emptyText: { textAlign: 'center', color: '#78716c', marginTop: 32, fontSize: 13 },
  rowCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ipText: { fontWeight: '800', fontSize: 13, color: '#1c1917' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  actionBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8c4a16',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  targetText: { fontSize: 13, fontWeight: '600', color: '#1c1917', marginTop: 6 },
  metaText: { fontSize: 11, color: '#57534e', marginTop: 4 },
  pathText: { fontSize: 11, color: '#78716c', marginTop: 2 },
  timeText: { fontSize: 10, color: '#a8a29e', marginTop: 4 },
});
