import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { mobileApi, Order } from '../services/api';

const STATUS_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ xử lý' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'delivered', label: 'Hoàn thành' },
];

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Chờ xử lý', bg: '#fef3c7', color: '#b45309' },
  processing: { label: 'Chờ xử lý', bg: '#fef3c7', color: '#b45309' },
  shipping: { label: 'Đang giao', bg: '#dbeafe', color: '#1d4ed8' },
  delivered: { label: 'Hoàn thành', bg: '#d1fae5', color: '#047857' },
  paid: { label: 'Đã TT', bg: '#d1fae5', color: '#047857' },
  unpaid: { label: 'Chưa TT', bg: '#fee2e2', color: '#b91c1c' },
};

const money = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;

export function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadOrders = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await mobileApi.getOrders(filter);
      setOrders(data);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể tải danh sách đơn hàng.');
    } finally {
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleUpdateStatus = async (
    id: string,
    payload: { shippingStatus?: string; paymentStatus?: string }
  ) => {
    setUpdating(true);
    try {
      const updated = await mobileApi.updateOrderStatus(id, payload);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      setSelected(updated);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Filter pills */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadOrders} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Chưa có đơn hàng nào.</Text>
        }
        renderItem={({ item }) => {
          const ship = STATUS_LABEL[item.shippingStatus] || {
            label: item.shippingStatus,
            bg: '#f5f5f4',
            color: '#57534e',
          };
          const pay = STATUS_LABEL[item.paymentStatus] || {
            label: item.paymentStatus,
            bg: '#f5f5f4',
            color: '#57534e',
          };
          return (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
              <View style={styles.cardTop}>
                <Text style={styles.orderCode}>#{item.orderCode}</Text>
                <View style={styles.badges}>
                  <View style={[styles.badge, { backgroundColor: pay.bg }]}>
                    <Text style={[styles.badgeText, { color: pay.color }]}>{pay.label}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: ship.bg }]}>
                    <Text style={[styles.badgeText, { color: ship.color }]}>{ship.label}</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.customerName}>
                {item.customerName} • {item.customerPhone}
              </Text>
              <Text style={styles.address} numberOfLines={1}>
                {item.customerAddress}, {item.customerCity}
              </Text>

              <View style={styles.cardBottom}>
                <Text style={styles.itemCount}>{item.items?.length || 0} sản phẩm</Text>
                <Text style={styles.total}>{money(item.totalAmount)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Order Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đơn #{selected?.orderCode}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={styles.closeBtn}>Đóng ✕</Text>
              </TouchableOpacity>
            </View>

            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Khách hàng</Text>
                <Text style={styles.detailText}>{selected.customerName}</Text>
                <Text style={styles.detailText}>SĐT: {selected.customerPhone}</Text>
                <Text style={styles.detailText}>
                  Địa chỉ: {selected.customerAddress}
                  {selected.customerDistrict ? `, ${selected.customerDistrict}` : ''},{' '}
                  {selected.customerCity}
                </Text>
                {selected.customerNote ? (
                  <Text style={styles.detailText}>Ghi chú: {selected.customerNote}</Text>
                ) : null}

                <Text style={styles.sectionTitle}>Sản phẩm</Text>
                {selected.items?.map((it) => (
                  <View key={it.id} style={styles.itemRow}>
                    <Text style={styles.itemName}>
                      {it.productName} ({it.variantWeight}) x{it.quantity}
                    </Text>
                    <Text style={styles.itemPrice}>{money(it.price * it.quantity)}</Text>
                  </View>
                ))}

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tổng thanh toán</Text>
                  <Text style={styles.totalValue}>{money(selected.totalAmount)}</Text>
                </View>

                <Text style={styles.sectionTitle}>Cập nhật giao hàng</Text>
                <View style={styles.actionRow}>
                  {(['pending', 'shipping', 'delivered'] as const).map((st) => (
                    <TouchableOpacity
                      key={st}
                      disabled={updating}
                      style={[
                        styles.actionBtn,
                        selected.shippingStatus === st && styles.actionBtnActive,
                      ]}
                      onPress={() => handleUpdateStatus(selected.id, { shippingStatus: st })}
                    >
                      <Text
                        style={[
                          styles.actionBtnText,
                          selected.shippingStatus === st && styles.actionBtnTextActive,
                        ]}
                      >
                        {STATUS_LABEL[st].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>Thanh toán</Text>
                <View style={styles.actionRow}>
                  {(['unpaid', 'paid'] as const).map((st) => (
                    <TouchableOpacity
                      key={st}
                      disabled={updating}
                      style={[
                        styles.actionBtn,
                        selected.paymentStatus === st && styles.actionBtnActive,
                      ]}
                      onPress={() => handleUpdateStatus(selected.id, { paymentStatus: st })}
                    >
                      <Text
                        style={[
                          styles.actionBtnText,
                          selected.paymentStatus === st && styles.actionBtnTextActive,
                        ]}
                      >
                        {STATUS_LABEL[st].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f4',
  },
  filterPillActive: { backgroundColor: '#8c4a16' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#57534e' },
  filterTextActive: { color: '#fff' },
  listContent: { padding: 14, gap: 10 },
  emptyText: { textAlign: 'center', color: '#78716c', marginTop: 40, fontSize: 13 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCode: { fontWeight: '800', fontSize: 14, color: '#1c1917' },
  badges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  customerName: { fontSize: 13, fontWeight: '600', color: '#292524', marginTop: 6 },
  address: { fontSize: 12, color: '#78716c', marginTop: 2 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f4',
  },
  itemCount: { fontSize: 12, color: '#78716c' },
  total: { fontSize: 15, fontWeight: '800', color: '#8c4a16' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1c1917' },
  closeBtn: { fontSize: 13, fontWeight: '700', color: '#8c4a16' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716c',
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
  },
  detailText: { fontSize: 13, color: '#292524', marginBottom: 3 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  itemName: { flex: 1, fontSize: 13, color: '#292524', paddingRight: 8 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#1c1917' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e7e5e4',
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#1c1917' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#8c4a16' },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    backgroundColor: '#fafaf9',
  },
  actionBtnActive: { backgroundColor: '#8c4a16', borderColor: '#8c4a16' },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#44403c' },
  actionBtnTextActive: { color: '#fff' },
});
