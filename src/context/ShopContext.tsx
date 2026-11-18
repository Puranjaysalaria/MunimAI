import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, Item, Shop, Supplier, Transaction, User } from '../types/schema';
import {
  DEMO_SHOP_ID,
  INITIAL_CUSTOMERS,
  INITIAL_ITEMS,
  INITIAL_SUPPLIERS,
  generate14DaysTransactions,
} from '../data/mockData';

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
  loginDemo: () => void;
  logout: () => void;
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
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_active`) === 'true' || true;
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
  const [offlinePendingCount] = useState<number>(0);

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
        name: 'दुकानदार',
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

  const loginDemo = () => {
    const demoUser: User = {
      id: '00000000-0000-0000-0000-000000000002',
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

  const logout = () => {
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

  // Add Transaction
  const addTransaction = (txData: Omit<Transaction, 'id' | 'shop_id' | 'created_at'>): Transaction => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}`,
      shop_id: shop.id,
      created_at: new Date().toISOString(),
      synced: true,
    };

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
      return { success: false, message: 'कोई हालिया लेन-देन नहीं मिला' };
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
      message: `₹${txToUndo.amount} का लेन-देन वापस (Undo) कर दिया गया है`,
    };
  };

  // Attach proof audio clip
  const attachProofClip = (transactionId: string, proofClipPath: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? { ...t, proof_clip_path: proofClipPath } : t))
    );
  };

  const updateShopSettings = (settings: Partial<Shop>) => {
    setShop((prev) => ({ ...prev, ...settings }));
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
        loginDemo,
        logout,
        unlockWithPin,
        setShopPin,
        lockApp,
        addTransaction,
        undoLastTransaction,
        updateCustomerBalance,
        updateItemStock,
        attachProofClip,
        updateShopSettings,
        findCustomerByName,
        findItemByName,
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
