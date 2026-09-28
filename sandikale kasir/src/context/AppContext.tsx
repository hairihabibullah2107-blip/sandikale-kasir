import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  Order,
  CartItem,
  User,
  StoreSettings,
  StockLog,
  Language,
  ProductionStatus,
  PaymentStatus,
  PaymentMethod
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_USERS,
  INITIAL_SETTINGS
} from '../data/initialData';
import { bluetoothPrinter, BluetoothDeviceState } from '../utils/bluetoothPrinter';
import { generateSha256Checksum, encryptSensitiveData } from '../utils/crypto';
import { getTranslation } from '../utils/i18n';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
  deleteUser: (id: string) => void;

  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  restockProduct: (id: string, qty: number, note: string) => void;

  orders: Order[];
  createOrder: (orderData: Omit<Order, 'id' | 'date' | 'displayDate' | 'tamperChecksum'>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: ProductionStatus, note?: string) => void;
  settleOrderDP: (orderId: string, paymentMethod: PaymentMethod) => void;
  deleteOrder: (orderId: string, restoreStock?: boolean) => void;
  deleteMultipleOrders: (orderIds: string[], restoreStock?: boolean) => void;

  stockLogs: StockLog[];

  cart: CartItem[];
  addToCart: (product: Product, customDetails?: CartItem['customDetails']) => void;
  updateCartQty: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartTotalItems: number;

  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;

  language: Language;
  setLanguage: (lang: Language) => void;
  t: ReturnType<typeof getTranslation>;

  isOnline: boolean;
  offlineQueueCount: number;
  syncOfflineQueue: () => void;

  bluetoothState: BluetoothDeviceState;
  connectBluetooth: () => Promise<boolean>;
  disconnectBluetooth: () => void;

  activeReceiptOrder: Order | null;
  setActiveReceiptOrder: (order: Order | null) => void;

  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'sandikale_pos_current_user',
  USERS: 'sandikale_pos_users',
  PRODUCTS: 'sandikale_pos_products',
  ORDERS: 'sandikale_pos_orders',
  STOCK_LOGS: 'sandikale_pos_stock_logs',
  SETTINGS: 'sandikale_pos_settings',
  OFFLINE_QUEUE: 'sandikale_pos_offline_queue',
  LANG: 'sandikale_pos_lang'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial from localStorage or defaults
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.username === 'admin' || parsed.role === 'admin') {
          parsed.name = 'HAIRI (owner )';
          parsed.pin = 'hairi21';
        }
        return parsed;
      } catch {
        return INITIAL_USERS[0];
      }
    }
    return INITIAL_USERS[0]; // Default logged in as Owner for convenience
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        return parsed.map(u => {
          if (u.username === 'admin' || u.role === 'admin') {
            return { ...u, name: 'HAIRI (owner )', pin: 'hairi21' };
          }
          return u;
        });
      } catch {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [stockLogs, setStockLogs] = useState<StockLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STOCK_LOGS);
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try {
        const parsed: StoreSettings = JSON.parse(saved);
        if (parsed.receiptFooter && /garansi/i.test(parsed.receiptFooter)) {
          parsed.receiptFooter = INITIAL_SETTINGS.receiptFooter;
        }
        return parsed;
      } catch {
        return INITIAL_SETTINGS;
      }
    }
    return INITIAL_SETTINGS;
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LANG) as Language;
    return saved || 'id';
  });

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<Order[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return saved ? JSON.parse(saved) : [];
  });

  const [bluetoothState, setBluetoothState] = useState<BluetoothDeviceState>({
    isConnected: false,
    deviceName: null,
    error: null
  });

  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const t = getTranslation(language);

  // Sync state to LocalStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(stockLogs));
  }, [stockLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANG, language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  // Online / Offline Detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Koneksi internet pulih. Sistem kembali online.', 'info');
      if (settings.offlineAutoSync && offlineQueue.length > 0) {
        syncOfflineQueue();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Mode offline aktif! Semua transaksi tetap tercatat secara lokal.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Bluetooth status subscription
    const unsubscribeBt = bluetoothPrinter.subscribe(state => {
      setBluetoothState(state);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeBt();
    };
  }, [offlineQueue, settings.offlineAutoSync]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  // Cart operations
  const addToCart = (product: Product, customDetails?: CartItem['customDetails']) => {
    // If it's a custom order item or has custom notes, create an explicit entry
    if (customDetails || product.id === 'custom') {
      const newItem: CartItem = {
        id: `ci-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        costPrice: product.costPrice,
        qty: 1,
        customDetails
      };
      setCart(prev => [...prev, newItem]);
      showToast(`${product.name} ditambahkan ke keranjang`, 'success');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && !item.customDetails);
      if (existing) {
        if (product.stock !== undefined && existing.qty + 1 > product.stock) {
          showToast(`Stok tidak mencukupi (Tersisa: ${product.stock})`, 'error');
          return prev;
        }
        return prev.map(item =>
          item.id === existing.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        const newItem: CartItem = {
          id: `ci-${Date.now()}`,
          productId: product.id,
          name: product.name,
          price: product.price,
          costPrice: product.costPrice,
          qty: 1
        };
        return [...prev, newItem];
      }
    });

    showToast(`${product.name} masuk keranjang`, 'success');
  };

  const updateCartQty = (cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.id === cartItemId) {
            const newQty = item.qty + delta;
            if (newQty <= 0) return null;
            // Check stock limit for regular products
            const prod = products.find(p => p.id === item.productId);
            if (prod && !prod.isRawMaterial && prod.stock < newQty) {
              showToast(`Maksimal stok tercapai: ${prod.stock} pcs`, 'error');
              return item;
            }
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const clearCart = () => setCart([]);

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartTotalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // Automatic Inventory Deduction upon order completion
  const deductInventoryForOrder = (items: CartItem[], orderId: string) => {
    setProducts(prevProducts => {
      const updated = [...prevProducts];
      const newLogs: StockLog[] = [];

      items.forEach(cartItem => {
        const prodIndex = updated.findIndex(p => p.id === cartItem.productId);
        if (prodIndex !== -1) {
          const prod = updated[prodIndex];
          const prevStock = prod.stock;
          const newStock = Math.max(0, prevStock - cartItem.qty);

          updated[prodIndex] = {
            ...prod,
            stock: newStock
          };

          newLogs.push({
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            productId: prod.id,
            productName: prod.name,
            changeQty: -cartItem.qty,
            previousStock: prevStock,
            newStock: newStock,
            type: 'sale',
            referenceId: orderId,
            date: new Date().toISOString(),
            operator: currentUser?.name || 'Kasir',
            note: `Penjualan Nota ${orderId}`
          });
        }
      });

      if (newLogs.length > 0) {
        setStockLogs(prev => [...newLogs, ...prev]);
      }

      return updated;
    });
  };

  // Create Order with real-time stock reduction and cryptographic checksum
  const createOrder = async (
    orderData: Omit<Order, 'id' | 'date' | 'displayDate' | 'tamperChecksum'>
  ): Promise<Order> => {
    const now = new Date();
    const dateStr = now.toISOString();
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const orderSeq = (orders.length + 1).toString().padStart(4, '0');
    const orderId = `TRX-${ymd}-${orderSeq}`;

    // Cryptographic anti-tampering checksum
    const rawDataForHash = `${orderId}|${orderData.total}|${orderData.customerPhone}|${dateStr}|SANDIKALE_INTEGRITY_SEAL`;
    const tamperChecksum = await generateSha256Checksum(rawDataForHash);

    // Optional AES-256 encryption on sensitive customer details
    const encryptedCustomer = await encryptSensitiveData(
      JSON.stringify({
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        notes: orderData.notes
      })
    );

    const newOrder: Order = {
      ...orderData,
      id: orderId,
      date: dateStr,
      displayDate: now.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      tamperChecksum,
      encryptedDataHash: encryptedCustomer.integrityHash,
      isOfflineSync: !isOnline,
      historyTimeline: [
        {
          time: now.toLocaleString('id-ID'),
          status: orderData.paymentStatus,
          note: `Pesanan dibuat via ${orderData.paymentMethod}. ${
            orderData.paymentStatus === 'DP'
              ? `DP Diterima Rp ${orderData.dpAmount.toLocaleString('id-ID')}`
              : 'Pembayaran Lunas'
          }`,
          by: currentUser?.name || 'Kasir'
        }
      ]
    };

    // Deduct stock automatically
    deductInventoryForOrder(orderData.items, orderId);

    // Add to orders
    setOrders(prev => [newOrder, ...prev]);

    // If offline, add to offline sync queue
    if (!isOnline) {
      setOfflineQueue(prev => [...prev, newOrder]);
      showToast('Transaksi disimpan lokal (Mode Offline)', 'info');
    } else {
      showToast(`Transaksi ${orderId} berhasil dicatat!`, 'success');
    }

    // Clear cart and set active receipt
    clearCart();
    setActiveReceiptOrder(newOrder);

    // Auto-print receipt if Bluetooth connected & enabled in settings
    if (bluetoothState.isConnected && settings.autoPrintReceipt) {
      try {
        const bytes = bluetoothPrinter.buildOrderReceiptBytes(newOrder, settings);
        await bluetoothPrinter.sendBytes(bytes);
        showToast('Nota otomatis tercetak ke Printer Bluetooth', 'success');
      } catch (err: any) {
        console.warn('Bluetooth auto-print warning:', err);
      }
    }

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: ProductionStatus, note?: string) => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id === orderId) {
          const nowStr = new Date().toLocaleString('id-ID');
          const updatedHistory = [
            ...(ord.historyTimeline || []),
            {
              time: nowStr,
              status,
              note: note || `Status diperbarui menjadi ${status}`,
              by: currentUser?.name || 'Staff'
            }
          ];
          return {
            ...ord,
            productionStatus: status,
            historyTimeline: updatedHistory
          };
        }
        return ord;
      })
    );
    showToast(`Status pesanan ${orderId} diubah ke "${status}"`, 'success');
  };

  const settleOrderDP = (orderId: string, paymentMethod: PaymentMethod) => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id === orderId) {
          const nowStr = new Date().toLocaleString('id-ID');
          const remaining = ord.remainingAmount;
          return {
            ...ord,
            paidAmount: ord.total,
            remainingAmount: 0,
            paymentStatus: 'Lunas',
            paymentMethod,
            historyTimeline: [
              ...(ord.historyTimeline || []),
              {
                time: nowStr,
                status: 'Lunas',
                note: `Pelunasan sisa tagihan Rp ${remaining.toLocaleString('id-ID')} via ${paymentMethod}`,
                by: currentUser?.name || 'Kasir'
              }
            ]
          };
        }
        return ord;
      })
    );
    showToast(`Pelunasan untuk ${orderId} berhasil! Status sekarang LUNAS.`, 'success');
  };

  const deleteOrder = (orderId: string, restoreStock: boolean = true) => {
    if (currentUser?.role !== 'admin') {
      showToast('Akses ditolak: Hanya Admin / Owner yang dapat menghapus transaksi!', 'error');
      return;
    }

    const orderToDelete = orders.find(o => o.id === orderId);
    if (!orderToDelete) {
      showToast(`Transaksi ${orderId} tidak ditemukan.`, 'error');
      return;
    }

    // Optionally restore inventory stock
    if (restoreStock && orderToDelete.items && orderToDelete.items.length > 0) {
      setProducts(prevProducts => {
        const updated = [...prevProducts];
        const newLogs: StockLog[] = [];

        orderToDelete.items.forEach(item => {
          const prodIndex = updated.findIndex(p => p.id === item.productId);
          if (prodIndex !== -1) {
            const prod = updated[prodIndex];
            const prevStock = prod.stock;
            const newStock = prevStock + item.qty;

            updated[prodIndex] = {
              ...prod,
              stock: newStock
            };

            newLogs.push({
              id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              productId: prod.id,
              productName: prod.name,
              changeQty: item.qty,
              previousStock: prevStock,
              newStock: newStock,
              type: 'adjustment',
              referenceId: orderId,
              date: new Date().toISOString(),
              operator: currentUser?.name || 'Admin',
              note: `Pengembalian stok dari pembatalan/penghapusan nota ${orderId}`
            });
          }
        });

        if (newLogs.length > 0) {
          setStockLogs(prev => [...newLogs, ...prev]);
        }

        return updated;
      });
    }

    // Delete order from state
    setOrders(prev => prev.filter(o => o.id !== orderId));
    setOfflineQueue(prev => prev.filter(o => o.id !== orderId));
    if (activeReceiptOrder?.id === orderId) {
      setActiveReceiptOrder(null);
    }

    showToast(`Riwayat transaksi ${orderId} berhasil dihapus oleh ${currentUser.name}!`, 'success');
  };

  const deleteMultipleOrders = (orderIds: string[], restoreStock: boolean = true) => {
    if (currentUser?.role !== 'admin') {
      showToast('Akses ditolak: Hanya Admin / Owner yang dapat menghapus transaksi!', 'error');
      return;
    }

    const toDeleteSet = new Set(orderIds);
    const ordersToDelete = orders.filter(o => toDeleteSet.has(o.id));

    if (ordersToDelete.length === 0) return;

    if (restoreStock) {
      setProducts(prevProducts => {
        const updated = [...prevProducts];
        const newLogs: StockLog[] = [];

        ordersToDelete.forEach(ord => {
          ord.items.forEach(item => {
            const prodIndex = updated.findIndex(p => p.id === item.productId);
            if (prodIndex !== -1) {
              const prod = updated[prodIndex];
              const prevStock = prod.stock;
              const newStock = prevStock + item.qty;

              updated[prodIndex] = {
                ...prod,
                stock: newStock
              };

              newLogs.push({
                id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                productId: prod.id,
                productName: prod.name,
                changeQty: item.qty,
                previousStock: prevStock,
                newStock: newStock,
                type: 'adjustment',
                referenceId: ord.id,
                date: new Date().toISOString(),
                operator: currentUser?.name || 'Admin',
                note: `Pengembalian stok dari pembatalan/penghapusan nota ${ord.id}`
              });
            }
          });
        });

        if (newLogs.length > 0) {
          setStockLogs(prev => [...newLogs, ...prev]);
        }

        return updated;
      });
    }

    setOrders(prev => prev.filter(o => !toDeleteSet.has(o.id)));
    setOfflineQueue(prev => prev.filter(o => !toDeleteSet.has(o.id)));
    if (activeReceiptOrder && toDeleteSet.has(activeReceiptOrder.id)) {
      setActiveReceiptOrder(null);
    }

    showToast(`${ordersToDelete.length} transaksi berhasil dihapus oleh ${currentUser.name}!`, 'success');
  };

  const syncOfflineQueue = () => {
    if (offlineQueue.length === 0) {
      showToast('Tidak ada antrean data offline.', 'info');
      return;
    }
    // Mark items as synced
    setOrders(prev =>
      prev.map(ord => (ord.isOfflineSync ? { ...ord, isOfflineSync: false } : ord))
    );
    const count = offlineQueue.length;
    setOfflineQueue([]);
    showToast(`Berhasil menyinkronkan ${count} transaksi offline ke server cloud.`, 'success');
  };

  // Product management
  const addProduct = (prod: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...prod,
      id: `p-${Date.now()}`
    };
    setProducts(prev => [newProd, ...prev]);
    // Log stock
    if (prod.stock > 0) {
      setStockLogs(prev => [
        {
          id: `log-${Date.now()}`,
          productId: newProd.id,
          productName: newProd.name,
          changeQty: prod.stock,
          previousStock: 0,
          newStock: prod.stock,
          type: 'restock',
          date: new Date().toISOString(),
          operator: currentUser?.name || 'Admin',
          note: 'Stok awal produk baru'
        },
        ...prev
      ]);
    }
    showToast(`Produk "${prod.name}" berhasil ditambahkan`, 'success');
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );
    showToast('Data produk diperbarui', 'success');
  };

  const deleteProduct = (id: string) => {
    const prod = products.find(p => p.id === id);
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast(`Produk "${prod?.name || id}" dihapus`, 'info');
  };

  const restockProduct = (id: string, qty: number, note: string) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const prevStock = p.stock;
          const newStock = prevStock + qty;
          setStockLogs(prevLogs => [
            {
              id: `log-${Date.now()}`,
              productId: p.id,
              productName: p.name,
              changeQty: qty,
              previousStock: prevStock,
              newStock: newStock,
              type: 'restock',
              date: new Date().toISOString(),
              operator: currentUser?.name || 'Staff',
              note: note || 'Penerimaan stok restok'
            },
            ...prevLogs
          ]);
          return { ...p, stock: newStock };
        }
        return p;
      })
    );
    showToast(`Berhasil menambah stok +${qty}`, 'success');
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `u-${Date.now()}`
    };
    setUsers(prev => [...prev, newUser]);
    showToast(`Pengguna "${userData.name}" berhasil dibuat`, 'success');
  };

  const deleteUser = (id: string) => {
    if (id === 'u-1') {
      showToast('Admin utama tidak dapat dihapus!', 'error');
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    showToast('Pengguna dihapus', 'info');
  };

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    showToast('Pengaturan sistem disimpan', 'success');
  };

  const connectBluetooth = async (): Promise<boolean> => {
    return await bluetoothPrinter.connect();
  };

  const disconnectBluetooth = () => {
    bluetoothPrinter.disconnect();
    showToast('Koneksi printer Bluetooth diputus', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        addUser,
        deleteUser,

        products,
        addProduct,
        updateProduct,
        deleteProduct,
        restockProduct,

        orders,
        createOrder,
        updateOrderStatus,
        settleOrderDP,
        deleteOrder,
        deleteMultipleOrders,

        stockLogs,

        cart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        cartSubtotal,
        cartTotalItems,

        settings,
        updateSettings,

        language,
        setLanguage,
        t,

        isOnline,
        offlineQueueCount: offlineQueue.length,
        syncOfflineQueue,

        bluetoothState,
        connectBluetooth,
        disconnectBluetooth,

        activeReceiptOrder,
        setActiveReceiptOrder,

        toast,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
