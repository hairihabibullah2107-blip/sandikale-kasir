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
import { supabase } from '../lib/supabase';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

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
  // A fresh browser/device must never be logged in automatically.
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try {
        return JSON.parse(saved);
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
  const [cloudReady, setCloudReady] = useState(false);

  const t = getTranslation(language);
  const STORE_ID = 'sandikale';

  const productFromDb = (row: any): Product => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    price: Number(row.price || 0),
    costPrice: Number(row.cost_price || 0),
    stock: Number(row.stock || 0),
    minStock: Number(row.min_stock || 0),
    image: row.image || '',
    unit: row.unit || 'pcs',
    isRawMaterial: Boolean(row.is_raw_material),
    notes: row.notes || undefined
  });

  const productToDb = (product: Product) => ({
    id: product.id,
    store_id: STORE_ID,
    sku: product.sku,
    name: product.name,
    category: product.category,
    price: product.price,
    cost_price: product.costPrice,
    stock: product.stock,
    min_stock: product.minStock,
    image: product.image || null,
    unit: product.unit || 'pcs',
    is_raw_material: Boolean(product.isRawMaterial),
    notes: product.notes || null,
    updated_at: new Date().toISOString()
  });

  const userFromDb = (row: any): User => ({
    id: row.id,
    username: row.username || '',
    name: row.name || '',
    role: row.role,
    pin: ''
  });

  const loadUsersFromCloud = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, name, role, is_active, store_id')
      .eq('store_id', STORE_ID)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[SANDIKALE] User cloud load failed:', error);
      return false;
    }

    setUsers((data || []).map(userFromDb));
    return true;
  };

  const loadProductsFromCloud = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', STORE_ID)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[SANDIKALE] Product cloud load failed:', error);
      return false;
    }

    if (data && data.length > 0) {
      setProducts(data.map(productFromDb));
    } else {
      const { error: seedError } = await supabase
        .from('products')
        .upsert(products.map(productToDb), { onConflict: 'id' });

      if (seedError) {
        console.error('[SANDIKALE] Product cloud seed failed:', seedError);
        return false;
      }
    }

    return true;
  };


  const syncProductsToCloud = async (items: Product[]) => {
    if (!cloudReady || items.length === 0) return;
    const { error } = await supabase
      .from('products')
      .upsert(items.map(productToDb), { onConflict: 'id' });

    if (error) {
      console.error('[SANDIKALE] Product cloud sync failed:', error);
    }
  };

  const orderFromDb = (row: any): Order => ({
    id: row.id,
    date: row.date,
    displayDate: row.display_date || new Date(row.date).toLocaleString('id-ID'),
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone || '',
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    tax: Number(row.tax || 0),
    total: Number(row.total || 0),
    paidAmount: Number(row.paid_amount || 0),
    dpAmount: Number(row.dp_amount || 0),
    remainingAmount: Number(row.remaining_amount || 0),
    changeAmount: Number(row.change_amount || 0),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    productionStatus: row.production_status,
    cashierName: row.cashier_name || '',
    cashierId: row.cashier_id || '',
    isOfflineSync: Boolean(row.is_offline_sync),
    tamperChecksum: row.tamper_checksum || undefined,
    encryptedDataHash: row.encrypted_data_hash || undefined,
    notes: row.notes || undefined,
    mockupUrl: row.mockup_url || undefined,
    historyTimeline: Array.isArray(row.history_timeline) ? row.history_timeline : []
  });

  const orderToDb = (order: Order) => ({
    id: order.id,
    store_id: STORE_ID,
    date: order.date,
    display_date: order.displayDate,
    customer_name: order.customerName,
    customer_phone: order.customerPhone || '',
    items: order.items || [],
    subtotal: order.subtotal,
    discount: order.discount,
    tax: order.tax,
    total: order.total,
    paid_amount: order.paidAmount,
    dp_amount: order.dpAmount,
    remaining_amount: order.remainingAmount,
    change_amount: order.changeAmount,
    payment_method: order.paymentMethod,
    payment_status: order.paymentStatus,
    production_status: order.productionStatus,
    cashier_name: order.cashierName,
    cashier_id:
      (order.cashierId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(order.cashierId))
        ? order.cashierId
        : null,
    is_offline_sync: Boolean(order.isOfflineSync),
    tamper_checksum: order.tamperChecksum || null,
    encrypted_data_hash: order.encryptedDataHash || null,
    notes: order.notes || null,
    mockup_url: order.mockupUrl || null,
    history_timeline: order.historyTimeline || [],
    updated_at: new Date().toISOString()
  });

  const stockLogFromDb = (row: any): StockLog => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    changeQty: Number(row.change_qty || 0),
    previousStock: Number(row.previous_stock || 0),
    newStock: Number(row.new_stock || 0),
    type: row.type,
    referenceId: row.reference_id || undefined,
    date: row.date,
    operator: row.operator || 'Staff',
    note: row.note || undefined
  });

  const stockLogToDb = (log: StockLog) => ({
    id: log.id,
    store_id: STORE_ID,
    product_id: log.productId,
    product_name: log.productName,
    change_qty: log.changeQty,
    previous_stock: log.previousStock,
    new_stock: log.newStock,
    type: log.type,
    reference_id: log.referenceId || null,
    date: log.date,
    operator: log.operator,
    note: log.note || null
  });

  const loadOrdersFromCloud = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', STORE_ID)
      .order('date', { ascending: false });

    if (error) {
      console.error('[SANDIKALE] Order cloud load failed:', error);
      return false;
    }

    if (data && data.length > 0) {
      setOrders(data.map(orderFromDb));
    } else if (orders.length > 0) {
      const { error: seedError } = await supabase
        .from('orders')
        .upsert(orders.map(orderToDb), { onConflict: 'id' });
      if (seedError) {
        console.error('[SANDIKALE] Order cloud seed failed:', seedError);
        return false;
      }
    }
    return true;
  };

  const loadStockLogsFromCloud = async () => {
    const { data, error } = await supabase
      .from('stock_logs')
      .select('*')
      .eq('store_id', STORE_ID)
      .order('date', { ascending: false });

    if (error) {
      console.error('[SANDIKALE] Stock log cloud load failed:', error);
      return false;
    }

    if (data && data.length > 0) {
      setStockLogs(data.map(stockLogFromDb));
    } else if (stockLogs.length > 0) {
      const { error: seedError } = await supabase
        .from('stock_logs')
        .upsert(stockLogs.map(stockLogToDb), { onConflict: 'id' });
      if (seedError) {
        console.error('[SANDIKALE] Stock log cloud seed failed:', seedError);
        return false;
      }
    }
    return true;
  };

  const loadSettingsFromCloud = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('data')
      .eq('store_id', STORE_ID)
      .maybeSingle();

    if (error) {
      console.error('[SANDIKALE] Settings cloud load failed:', error);
      return false;
    }

    if (data?.data && typeof data.data === 'object') {
      setSettings(prev => ({ ...prev, ...(data.data as Partial<StoreSettings>) }));
    } else {
      const { error: seedError } = await supabase
        .from('settings')
        .upsert({
          id: STORE_ID,
          store_id: STORE_ID,
          data: settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'store_id' });
      if (seedError) {
        console.error('[SANDIKALE] Settings cloud seed failed:', seedError);
        return false;
      }
    }
    return true;
  };

  const syncOrderToCloud = async (order: Order) => {
    if (!cloudReady) return;
    const { error } = await supabase
      .from('orders')
      .upsert(orderToDb(order), { onConflict: 'id' });
    if (error) console.error('[SANDIKALE] Order cloud sync failed:', error);
  };

  const syncOrderPatchToCloud = async (orderId: string, patch: Partial<Order>) => {
    if (!cloudReady) return;
    const dbPatch: any = { updated_at: new Date().toISOString() };
    if (patch.productionStatus !== undefined) dbPatch.production_status = patch.productionStatus;
    if (patch.paidAmount !== undefined) dbPatch.paid_amount = patch.paidAmount;
    if (patch.remainingAmount !== undefined) dbPatch.remaining_amount = patch.remainingAmount;
    if (patch.paymentStatus !== undefined) dbPatch.payment_status = patch.paymentStatus;
    if (patch.paymentMethod !== undefined) dbPatch.payment_method = patch.paymentMethod;
    if (patch.historyTimeline !== undefined) dbPatch.history_timeline = patch.historyTimeline;
    if (patch.isOfflineSync !== undefined) dbPatch.is_offline_sync = patch.isOfflineSync;
    const { error } = await supabase
      .from('orders')
      .update(dbPatch)
      .eq('id', orderId)
      .eq('store_id', STORE_ID);
    if (error) console.error('[SANDIKALE] Order patch sync failed:', error);
  };

  const syncStockLogsToCloud = async (logs: StockLog[]) => {
    if (!cloudReady || logs.length === 0) return;
    const { error } = await supabase
      .from('stock_logs')
      .upsert(logs.map(stockLogToDb), { onConflict: 'id' });
    if (error) console.error('[SANDIKALE] Stock log cloud sync failed:', error);
  };

  const syncSettingsToCloud = async (nextSettings: StoreSettings) => {
    if (!cloudReady) return;
    const { error } = await supabase
      .from('settings')
      .upsert({
        id: STORE_ID,
        store_id: STORE_ID,
        data: nextSettings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'store_id' });
    if (error) console.error('[SANDIKALE] Settings cloud sync failed:', error);
  };

  // Sync state to LocalStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [currentUser]);

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

  // Load the active user list from Supabase so every device sees the same accounts.
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, name, role, is_active, store_id')
        .eq('store_id', STORE_ID)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (!cancelled && !error && data) {
        setUsers(data.map(userFromDb));
      }
    };

    void load();

    channel = supabase
      .channel('sandikale-users-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'store_id=eq.sandikale'
        },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  // Restore only a valid Supabase session on refresh.
  // A new device has no session and therefore remains on the login screen.
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, name, role')
        .eq('id', data.session.user.id)
        .single();

      if (!cancelled && profile) {
        setCurrentUser({
          id: profile.id,
          username: profile.username || '',
          name: profile.name || '',
          role: profile.role,
          pin: ''
        });
      }
    };

    void restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !cancelled) {
        setCurrentUser(null);
      }
      if (event === 'SIGNED_IN' && session && !cancelled) {
        void supabase
          .from('profiles')
          .select('id, username, name, role')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (!cancelled && profile) {
              setCurrentUser({
                id: profile.id,
                username: profile.username || '',
                name: profile.name || '',
                role: profile.role,
                pin: ''
              });
            }
          });
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Supabase session + realtime product synchronization.
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const connectCloud = async () => {
      if (!currentUser) {
        setCloudReady(false);
        return;
      }

      const session = (await supabase.auth.getSession()).data.session;

      // Cloud data is available only after a real Supabase Auth login.
      if (!session) {
        setCloudReady(false);
        return;
      }

      if (cancelled) return;

      const loadedProducts = await loadProductsFromCloud();
      const loadedOrders = await loadOrdersFromCloud();
      const loadedStockLogs = await loadStockLogsFromCloud();
      const loadedSettings = await loadSettingsFromCloud();
      if (cancelled) return;
      const loaded = loadedProducts && loadedOrders && loadedStockLogs && loadedSettings;
      setCloudReady(loaded);

      if (!loaded) return;

      channel = supabase
        .channel('sandikale-cloud-sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products',
            filter: 'store_id=eq.sandikale'
          },
          async () => {
            const { data } = await supabase
              .from('products')
              .select('*')
              .eq('store_id', STORE_ID)
              .order('updated_at', { ascending: false });
            if (!cancelled && data) {
              const next = data.map(productFromDb);
              setProducts(prev =>
                JSON.stringify(prev) === JSON.stringify(next) ? prev : next
              );
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: 'store_id=eq.sandikale'
          },
          async () => {
            const { data } = await supabase
              .from('orders')
              .select('*')
              .eq('store_id', STORE_ID)
              .order('date', { ascending: false });
            if (!cancelled && data) setOrders(data.map(orderFromDb));
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'stock_logs',
            filter: 'store_id=eq.sandikale'
          },
          async () => {
            const { data } = await supabase
              .from('stock_logs')
              .select('*')
              .eq('store_id', STORE_ID)
              .order('date', { ascending: false });
            if (!cancelled && data) setStockLogs(data.map(stockLogFromDb));
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'settings',
            filter: 'store_id=eq.sandikale'
          },
          async () => {
            const { data } = await supabase
              .from('settings')
              .select('data')
              .eq('store_id', STORE_ID)
              .maybeSingle();
            if (!cancelled && data?.data) {
              setSettings(prev => ({ ...prev, ...(data.data as Partial<StoreSettings>) }));
            }
          }
        )
        .subscribe();
    };

    void connectCloud();

    return () => {
      cancelled = true;
      setCloudReady(false);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Push product changes made on this device to the shared database.
  useEffect(() => {
    if (!cloudReady) return;
    const timer = window.setTimeout(() => {
      void syncProductsToCloud(products);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [products, cloudReady]);

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
        void syncStockLogsToCloud(newLogs);
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
    const orderSeq = String(Date.now()).slice(-6);
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

    if (isOnline && cloudReady) {
      void syncOrderToCloud(newOrder);
    }

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
    const currentOrder = orders.find(ord => ord.id === orderId);
    if (currentOrder) {
      const nowStr = new Date().toLocaleString('id-ID');
      const historyTimeline = [
        ...(currentOrder.historyTimeline || []),
        {
          time: nowStr,
          status,
          note: note || `Status diperbarui menjadi ${status}`,
          by: currentUser?.name || 'Staff'
        }
      ];
      void syncOrderPatchToCloud(orderId, { productionStatus: status, historyTimeline });
    }
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
    const currentOrder = orders.find(ord => ord.id === orderId);
    if (currentOrder) {
      const remaining = currentOrder.remainingAmount;
      const nowStr = new Date().toLocaleString('id-ID');
      const historyTimeline = [
        ...(currentOrder.historyTimeline || []),
        {
          time: nowStr,
          status: 'Lunas',
          note: `Pelunasan sisa tagihan Rp ${remaining.toLocaleString('id-ID')} via ${paymentMethod}`,
          by: currentUser?.name || 'Kasir'
        }
      ];
      void syncOrderPatchToCloud(orderId, {
        paidAmount: currentOrder.total,
        remainingAmount: 0,
        paymentStatus: 'Lunas',
        paymentMethod,
        historyTimeline
      });
    }
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
          void syncStockLogsToCloud(newLogs);
        }

        return updated;
      });
    }

    // Delete order from state
    setOrders(prev => prev.filter(o => o.id !== orderId));
    setOfflineQueue(prev => prev.filter(o => o.id !== orderId));
    if (cloudReady) {
      void supabase.from('orders').delete().eq('id', orderId).eq('store_id', STORE_ID);
    }
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
          void syncStockLogsToCloud(newLogs);
        }

        return updated;
      });
    }

    setOrders(prev => prev.filter(o => !toDeleteSet.has(o.id)));
    setOfflineQueue(prev => prev.filter(o => !toDeleteSet.has(o.id)));
    if (cloudReady) {
      void Promise.all(
        orderIds.map(id =>
          supabase.from('orders').delete().eq('id', id).eq('store_id', STORE_ID)
        )
      );
    }
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
    const queue = [...offlineQueue];
    const upload = async () => {
      if (!cloudReady) {
        showToast('Cloud belum siap. Coba lagi setelah koneksi stabil.', 'error');
        return;
      }
      const { error } = await supabase
        .from('orders')
        .upsert(queue.map(order => orderToDb({ ...order, isOfflineSync: false })), { onConflict: 'id' });
      if (error) {
        showToast(`Sinkronisasi gagal: ${error.message}`, 'error');
        return;
      }
      setOrders(prev =>
        prev.map(ord => (ord.isOfflineSync ? { ...ord, isOfflineSync: false } : ord))
      );
      setOfflineQueue([]);
      showToast(`Berhasil menyinkronkan ${queue.length} transaksi offline ke server cloud.`, 'success');
    };
    void upload();
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
      const log: StockLog = {
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
      };
      setStockLogs(prev => [log, ...prev]);
      void syncStockLogsToCloud([log]);
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
    if (cloudReady) {
      void supabase.from('products').delete().eq('id', id).eq('store_id', STORE_ID);
    }
    showToast(`Produk "${prod?.name || id}" dihapus`, 'info');
  };

  const restockProduct = (id: string, qty: number, note: string) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const prevStock = p.stock;
          const newStock = prevStock + qty;
          const log: StockLog = {
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
          };
          setStockLogs(prevLogs => [log, ...prevLogs]);
          void syncStockLogsToCloud([log]);
          return { ...p, stock: newStock };
        }
        return p;
      })
    );
    showToast(`Berhasil menambah stok +${qty}`, 'success');
  };

  const addUser = async (userData: Omit<User, 'id'>) => {
    if (currentUser?.role !== 'admin') {
      showToast('Akses ditolak: Hanya Admin / Owner yang dapat membuat pengguna.', 'error');
      return;
    }

    const username = userData.username.trim().toLowerCase();
    if (!username || !userData.name.trim()) {
      showToast('Nama dan username internal wajib diisi.', 'error');
      return;
    }

    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: {
        action: 'upsert_user',
        name: userData.name.trim(),
        username,
        role: userData.role,
        password: userData.pin || '1234'
      }
    });

    if (error || !data?.success) {
      console.error('[SANDIKALE] User cloud management failed:', error, data);
      showToast(
        `Gagal membuat/memperbarui pengguna: ${data?.error || error?.message || 'Kesalahan cloud'}`,
        'error'
      );
      return;
    }

    await loadUsersFromCloud();
    showToast(`Pengguna "${userData.name}" berhasil disinkronkan dengan akun cloud.`, 'success');
  };

  const deleteUser = async (id: string) => {
    if (currentUser?.role !== 'admin') {
      showToast('Akses ditolak: Hanya Admin / Owner yang dapat menghapus pengguna.', 'error');
      return;
    }

    if (id === currentUser.id) {
      showToast('Admin yang sedang login tidak dapat dinonaktifkan.', 'error');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', id)
      .eq('store_id', STORE_ID);

    if (error) {
      showToast(`Gagal menonaktifkan pengguna: ${error.message}`, 'error');
      return;
    }

    await loadUsersFromCloud();
    showToast('Pengguna dinonaktifkan dan tidak lagi muncul di layar login.', 'info');
  };

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...newSettings };
      void syncSettingsToCloud(next);
      return next;
    });
    showToast('Pengaturan sistem disimpan', 'success');
  };

  const connectBluetooth = async (): Promise<boolean> => {
    return await bluetoothPrinter.connect();
  };

  const disconnectBluetooth = () => {
    bluetoothPrinter.disconnect();
    showToast('Koneksi printer Bluetooth diputus', 'info');
  };

  const handleSetCurrentUser = (user: User | null) => {
    setCurrentUser(user);
    if (!user) {
      void supabase.auth.signOut();
      setCloudReady(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser: handleSetCurrentUser,
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