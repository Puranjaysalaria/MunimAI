import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, Item, Shop, Supplier, Transaction, User, UserRole } from '../types/schema';
import {
  DEMO_SHOP_ID,
  INITIAL_CUSTOMERS,
  INITIAL_ITEMS,
  INITIAL_SUPPLIERS,
  generate14DaysTransactions,
} from '../data/mockData';
import {
  queueTransactionOffline,
  drainOfflineQueue,
  getOfflinePendingCount,
  announceSyncSuccess,
} from '../offline/syncEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ShopContextType {
  shop: Shop;
  user: User | null;
  customers: Customer[];
  items: Item[];
  suppliers: Supplier[];
  transactions: Transaction[];
  lastTransaction: Transaction | null;
  isLocked: boolean;
  isLoggedIn: boolean;
  hasPin: boolean;
  offlinePendingCount: number;
  loginWithPhone: (phone: string, otp: string) => boolean;
  loginWithSupabase: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithSupabase: (email: string, password: string, shopName: string, ownerName: string) => Promise<{ success: boolean; error?: string }>;
  loginDemo: () => Promise<void> | void;
  logout: () => Promise<void> | void;
  unlockWithPin: (pin: string) => boolean;
  setShopPin: (pin: string) => void;
  lockApp: () => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'shop_id' | 'created_at'>) => Transaction;
  undoLastTransaction: () => { success: boolean; message: string };
  updateCustomerBalance: (customerId: string, amountChange: number) => void;
  updateItemStock: (itemNameOrId: string, quantitySold: number) => void;
  attachProofClip: (transactionId: string, proofClipPath: string) => void;
  updateShopSettings: (settings: Partial<Shop>) => void;
  findCustomerByName: (query: string) => Customer[];
  findItemByName: (query: string) => Item | undefined;
  addCustomer: (cust: Omit<Customer, 'id' | 'shop_id' | 'created_at' | 'updated_at'>) => Promise<Customer>;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => void;
  syncOfflineData: () => Promise<number>;
  setUserRole: (role: UserRole) => void;
}

const ShopContext = createContext<ShopContextType | null>(null);

const STORAGE_KEY_PREFIX = 'munim_ai_';

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State from localStorage or default mock
  const [shop, setShop] = useState<Shop>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}shop`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      id: DEMO_SHOP_ID,
      name: 'Sharma Kirana Store',
      owner_phone: '+919876543210',
      upi_id: 'sharmakirana@okaxis',
      pin_hash: '1234', // Default demo PIN
    };
  });

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}user`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      id: '00000000-0000-0000-0000-000000000002',
      shop_id: DEMO_SHOP_ID,
      phone: '+919876543210',
      name: 'Madan Lal Sharma',
      role: 'owner',
    };
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_active`) === 'true';
  });

  const [isLocked, setIsLocked] = useState<boolean>(false);

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}customers`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_CUSTOMERS;
  });

  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}items`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_ITEMS;
  });

  const [suppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}transactions`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return generate14DaysTransactions();
  });

  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(0);

  // Initialize and monitor offline queue count
  useEffect(() => {
    getOfflinePendingCount().then((count) => setOfflinePendingCount(count));
  }, []);

  // Fetch live cloud data from Supabase if configured & online
  useEffect(() => {
    if (!isSupabaseConfigured() || !navigator.onLine) return;

    const fetchLiveCloudData = async () => {
      try {
        const [cRes, iRes, tRes] = await Promise.all([
          supabase.from('customers').select('*').order('created_at', { ascending: false }),
          supabase.from('items').select('*'),
          supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(60),
        ]);

        if (cRes.data && cRes.data.length > 0) {
          setCustomers(cRes.data as Customer[]);
        }
        if (iRes.data && iRes.data.length > 0) {
          setItems(iRes.data as Item[]);
        }
        if (tRes.data && tRes.data.length > 0) {
          const mappedTxs: Transaction[] = tRes.data.map((row: any) => ({
            id: row.id,
            shop_id: row.shop_id,
            type: row.type,
            amount: Number(row.amount),
            items: row.items || [],
            customer_id: row.customer_id,
            confirmed_by_voice: row.confirmed_by_voice,
            proof_clip_path: row.proof_clip_path,
            voice_transcript: row.voice_transcript,
            created_at: row.created_at,
            synced: true,
          }));
          setTransactions(mappedTxs);
        }
      } catch (err) {
        console.warn('Could not sync initial data with Supabase, using local state:', err);
      }
    };

    fetchLiveCloudData();
  }, []);

  // Listen for online recovery to automatically sync offline queue
  useEffect(() => {
    const handleOnline = async () => {
      const res = await drainOfflineQueue(shop.id);
      if (res.syncedCount > 0) {
        announceSyncSuccess(res.syncedCount, 'hi');
      }
      const remaining = await getOfflinePendingCount();
      setOfflinePendingCount(remaining);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [shop.id]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}shop`, JSON.stringify(shop));
  }, [shop]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}customers`, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}items`, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}transactions`, JSON.stringify(transactions));
  }, [transactions]);

  // Auth functions
  const loginWithPhone = (phone: string, otp: string): boolean => {
    if (otp === '1234' || otp.length === 4) {
      const newUser: User = {
        id: `usr-${Date.now()}`,
        shop_id: shop.id,
        phone,
        name: 'Shop Owner',
        role: 'owner',
      };
      setUser(newUser);
      setIsLoggedIn(true);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}auth_active`, 'true');
      localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(newUser));
      return true;
    }
    return false;
  };

  // Real-time Supabase Auth Login
  const loginWithSupabase = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.session) {
        setIsLoggedIn(true);
        setIsLocked(false);
        localStorage.setItem(`${STORAGE_KEY_PREFIX}auth_active`, 'true');

        // Fetch live user & shop profile
        const { data: userProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userProfile) {
          setUser(userProfile as User);
          localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(userProfile));
        }

        const { data: shopProfile } = await supabase
          .from('shops')
          .select('*')
          .eq('id', userProfile?.shop_id || DEMO_SHOP_ID)
          .single();

        if (shopProfile) {
          setShop(shopProfile as Shop);
          localStorage.setItem(`${STORAGE_KEY_PREFIX}shop`, JSON.stringify(shopProfile));
        }

        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Login failed' };
    }
  };

  // Real-time Supabase Auth Sign Up
  const signUpWithSupabase = async (
    email: string,
    password: string,
    shopName: string,
    ownerName: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { shop_name: shopName, owner_name: ownerName },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.user) {
        const newShopId = crypto.randomUUID();
        await supabase.from('shops').insert({
          id: newShopId,
          name: shopName || 'Kirana Store',
          owner_phone: '+919999999999',
        });

        await supabase.from('users').insert({
          id: data.user.id,
          shop_id: newShopId,
          name: ownerName || 'Shop Owner',
          phone: '+919999999999',
          role: 'owner',
        });

        return await loginWithSupabase(email, password);
      }

      return { success: false, error: 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Registration failed' };
    }
  };

  const loginDemo = async () => {
    // Authenticate with real live Supabase cloud account!
    if (isSupabaseConfigured() && navigator.onLine) {
      const res = await loginWithSupabase('shopkeeper@munimai.com', 'MunimStore123!');
      if (res.success) return;
    }

    const demoUser: User = {
      id: 'd7367b1a-b1fc-4835-b3b6-ccdba3f14598',
      shop_id: DEMO_SHOP_ID,
      phone: '+919876543210',
      name: 'Madan Lal Sharma',
      role: 'owner',
    };
    setUser(demoUser);
    setIsLoggedIn(true);
    setIsLocked(false);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}auth_active`, 'true');
    localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(demoUser));
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
    setIsLoggedIn(false);
    setIsLocked(false);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}auth_active`);
  };

  const unlockWithPin = (pin: string): boolean => {
    if (!shop.pin_hash || shop.pin_hash === pin) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const setShopPin = (pin: string) => {
    setShop((prev) => ({ ...prev, pin_hash: pin }));
  };

  const lockApp = () => {
    if (shop.pin_hash) {
      setIsLocked(true);
    }
  };

  // Find customer helper (case insensitive, partial match)
  const findCustomerByName = (query: string): Customer[] => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];
    return customers.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(cleanQuery);
      const noteMatch = c.address_note?.toLowerCase().includes(cleanQuery);
      return nameMatch || noteMatch;
    });
  };

  // Find item by name or synonyms
  const findItemByName = (query: string): Item | undefined => {
    const clean = query.trim().toLowerCase();
    return items.find(
      (item) =>
        item.name.toLowerCase() === clean ||
        item.synonyms.some((s) => s.toLowerCase() === clean || clean.includes(s.toLowerCase()))
    );
  };

  // Update customer balance (+ adds udhaar, - reduces udhaar)
  const updateCustomerBalance = (customerId: string, amountChange: number) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const newBalance = Math.max(0, Number(c.balance_owed) + amountChange);
          return { ...c, balance_owed: newBalance };
        }
        return c;
      })
    );
  };

  // Update stock
  const updateItemStock = (itemNameOrId: string, quantitySold: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (
          item.id === itemNameOrId ||
          item.name.toLowerCase() === itemNameOrId.toLowerCase() ||
          item.synonyms.some((s) => s.toLowerCase() === itemNameOrId.toLowerCase())
        ) {
          const newStock = Math.max(0, Number(item.current_stock) - quantitySold);
          const dailyAvg = item.daily_avg_sales || 5;
          const daysLeft = Number((newStock / dailyAvg).toFixed(1));
          return { ...item, current_stock: newStock, days_stock_left: daysLeft };
        }
        return item;
      })
    );
  };

  // Add Customer (Local + Cloud)
  const addCustomer = async (custData: Omit<Customer, 'id' | 'shop_id' | 'created_at' | 'updated_at'>): Promise<Customer> => {
    let cloudId: string | null = null;

    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const { data, error } = await supabase.from('customers').insert({
          shop_id: shop.id,
          name: custData.name,
          phone: custData.phone || null,
          preferred_language: custData.preferred_language || null,
          address_note: custData.address_note || null,
          credit_limit: custData.credit_limit || 5000,
          balance_owed: custData.balance_owed || 0,
          trust_score: custData.trust_score || 85,
        }).select();

        if (error) {
          console.error('Failed to create customer in cloud:', error);
        } else if (data && data[0]) {
          cloudId = data[0].id;
        }
      } catch (err) {
        console.error('Failed to create customer in cloud:', err);
      }
    }

    const newCust: Customer = {
      ...custData,
      id: cloudId || `cust-${Date.now()}`,
      shop_id: shop.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setCustomers((prev) => [newCust, ...prev.filter(c => c.name.toLowerCase() !== newCust.name.toLowerCase())]);
    return newCust;
  };

  // Add Transaction
  const addTransaction = (txData: Omit<Transaction, 'id' | 'shop_id' | 'created_at'>): Transaction => {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}`,
      shop_id: shop.id,
      created_at: new Date().toISOString(),
      synced: !isOffline,
    };

    // Queue in IndexedDB if offline
    if (isOffline) {
      queueTransactionOffline(newTx, shop.id).then(() => {
        getOfflinePendingCount().then((count) => setOfflinePendingCount(count));
      });
    }

    // Save to Supabase Cloud if configured & online
    if (isSupabaseConfigured() && !isOffline) {
      const dbTxId = newTx.id.startsWith('tx-') ? undefined : newTx.id;
      supabase
        .from('transactions')
        .insert({
          id: dbTxId,
          shop_id: shop.id,
          type: newTx.type,
          amount: newTx.amount,
          items: newTx.items || [],
          customer_id: newTx.customer_id || null,
          confirmed_by_voice: Boolean(newTx.confirmed_by_voice),
          voice_transcript: newTx.voice_transcript || null,
          proof_clip_path: newTx.proof_clip_path || null,
          created_at: newTx.created_at,
        })
        .then(({ error }) => {
          if (error) console.error('Failed to persist transaction to Supabase:', error);
        });

      if (newTx.customer_id) {
        const cust = customers.find((c) => c.id === newTx.customer_id);
        const change =
          newTx.type === 'credit' ? newTx.amount : newTx.type === 'payment' ? -newTx.amount : 0;
        if (cust && change !== 0) {
          const updatedBal = Math.max(0, Number(cust.balance_owed) + change);
          supabase
            .from('customers')
            .update({ balance_owed: updatedBal, updated_at: new Date().toISOString() })
            .eq('id', newTx.customer_id)
            .then(({ error }) => {
              if (error) console.error('Failed to update customer balance in Supabase:', error);
            });
        }
      }
    }

    // 1. Update customer balance if credit or payment
    if (newTx.type === 'credit' && newTx.customer_id) {
      updateCustomerBalance(newTx.customer_id, newTx.amount);
    } else if (newTx.type === 'payment' && newTx.customer_id) {
      updateCustomerBalance(newTx.customer_id, -newTx.amount);
    }

    // 2. Reduce stock if items sold
    if (newTx.items && newTx.items.length > 0) {
      newTx.items.forEach((it) => {
        if (it.quantity > 0) {
          updateItemStock(it.name, it.quantity);
        }
      });
    }

    setTransactions((prev) => [newTx, ...prev]);
    setLastTransaction(newTx);
    return newTx;
  };

  // Undo Last Transaction ("Wapas karo")
  const undoLastTransaction = (): { success: boolean; message: string } => {
    if (!lastTransaction) {
      return { success: false, message: 'No recent transaction to undo' };
    }

    const txToUndo = lastTransaction;

    // Reverse customer balance
    if (txToUndo.type === 'credit' && txToUndo.customer_id) {
      updateCustomerBalance(txToUndo.customer_id, -txToUndo.amount);
    } else if (txToUndo.type === 'payment' && txToUndo.customer_id) {
      updateCustomerBalance(txToUndo.customer_id, txToUndo.amount);
    }

    // Restore stock
    if (txToUndo.items && txToUndo.items.length > 0) {
      txToUndo.items.forEach((it) => {
        if (it.quantity > 0) {
          updateItemStock(it.name, -it.quantity); // negative reduces reduction = restores stock
        }
      });
    }

    // Remove from transactions list
    setTransactions((prev) => prev.filter((t) => t.id !== txToUndo.id));
    setLastTransaction(null);

    return {
      success: true,
      message: `Transaction of ₹${txToUndo.amount} undone successfully`,
    };
  };

  // Attach proof audio clip
  const attachProofClip = (transactionId: string, proofClipPath: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? { ...t, proof_clip_path: proofClipPath } : t))
    );

    if (isSupabaseConfigured() && navigator.onLine) {
      supabase
        .from('transactions')
        .update({ proof_clip_path: proofClipPath })
        .eq('id', transactionId)
        .then(({ error }) => {
          if (error) console.error('Failed to update proof_clip_path in Supabase:', error);
        });
    }
  };

  const updateShopSettings = (settings: Partial<Shop>) => {
    setShop((prev) => {
      const updated: Shop = {
        ...prev,
        ...settings,
        settings: {
          ...(prev.settings || {}),
          ...(settings.settings || {}),
        },
      };
      return updated;
    });

    if (isSupabaseConfigured() && navigator.onLine) {
      supabase
        .from('shops')
        .update({
          name: settings.name || shop.name,
          upi_id: settings.upi_id !== undefined ? settings.upi_id : shop.upi_id,
          settings: {
            ...(shop.settings || {}),
            ...(settings.settings || {}),
          },
        })
        .eq('id', shop.id)
        .then(({ error }) => {
          if (error) console.error('Failed to update shop settings in Supabase:', error);
        });
    }
  };

  const updateCustomer = (customerId: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          return { ...c, ...updates, updated_at: new Date().toISOString() };
        }
        return c;
      })
    );

    if (isSupabaseConfigured() && navigator.onLine) {
      supabase
        .from('customers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', customerId)
        .then(({ error }) => {
          if (error) console.error('Failed to update customer in Supabase:', error);
        });
    }
  };

  // Trigger manual sync
  const syncOfflineData = async (): Promise<number> => {
    const res = await drainOfflineQueue(shop.id);
    const count = await getOfflinePendingCount();
    setOfflinePendingCount(count);
    if (res.syncedCount > 0) {
      announceSyncSuccess(res.syncedCount, 'hi');
    }
    return res.syncedCount;
  };

  // Change active user role
  const setUserRole = (role: UserRole) => {
    setUser((prev) => (prev ? { ...prev, role } : null));
  };

  return (
    <ShopContext.Provider
      value={{
        shop,
        user,
        customers,
        items,
        suppliers,
        transactions,
        lastTransaction,
        isLocked,
        isLoggedIn,
        hasPin: Boolean(shop.pin_hash),
        offlinePendingCount,
        loginWithPhone,
        loginWithSupabase,
        signUpWithSupabase,
        loginDemo,
        logout,
        unlockWithPin,
        setShopPin,
        lockApp,
        addTransaction,
        addCustomer,
        undoLastTransaction,
        updateCustomerBalance,
        updateItemStock,
        attachProofClip,
        updateShopSettings,
        updateCustomer,
        findCustomerByName,
        findItemByName,
        syncOfflineData,
        setUserRole,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = (): ShopContextType => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
