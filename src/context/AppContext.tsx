import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, ParkingLot } from '../types/index.ts';
import { fetchUsers, unlockSlot, fetchLots } from '../lib/api.ts';

export interface ActiveLock {
  slotId: string;
  lotId: string;
  slotNumber: string;
  lotName: string;
  expiresAt: string; // ISO timestamp
  pricePerHour: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  users: User[];
  reloadUsers: () => Promise<void>;
  currentView: 'landing' | 'lot-detail' | 'bookings' | 'admin' | 'api-docs' | 'schema';
  setCurrentView: (view: 'landing' | 'lot-detail' | 'bookings' | 'admin' | 'api-docs' | 'schema') => void;
  selectedLotId: string | null;
  setSelectedLotId: (id: string | null) => void;
  bookingSlotId: string | null;
  setBookingSlotId: (slotId: string | null) => void;
  activeLock: ActiveLock | null;
  setActiveLock: (lock: ActiveLock | null) => void;
  lockSecondsRemaining: number;
  releaseActiveLock: () => Promise<void>;
  sessionId: string;
  refreshTrigger: number;
  triggerRefresh: () => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  lots: ParkingLot[];
  loadingLots: boolean;
  refreshLots: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Generate unique persistent session ID for lock ownership
function getOrCreateSessionId(): string {
  let sid = sessionStorage.getItem('parkease_session_id');
  if (!sid) {
    sid = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    sessionStorage.setItem('parkease_session_id', sid);
  }
  return sid;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId] = useState<string>(getOrCreateSessionId());
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'landing' | 'lot-detail' | 'bookings' | 'admin' | 'api-docs' | 'schema'>('landing');
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [loadingLots, setLoadingLots] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Stored lock
  const [activeLock, setActiveLockState] = useState<ActiveLock | null>(() => {
    try {
      const stored = sessionStorage.getItem('parkease_active_lock');
      if (stored) {
        const parsed: ActiveLock = JSON.parse(stored);
        if (new Date(parsed.expiresAt).getTime() > Date.now()) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [lockSecondsRemaining, setLockSecondsRemaining] = useState<number>(0);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setActiveLock = useCallback((lock: ActiveLock | null) => {
    setActiveLockState(lock);
    if (lock) {
      sessionStorage.setItem('parkease_active_lock', JSON.stringify(lock));
    } else {
      sessionStorage.removeItem('parkease_active_lock');
    }
  }, []);

  const releaseActiveLock = useCallback(async () => {
    if (activeLock) {
      try {
        await unlockSlot(activeLock.slotId, sessionId);
      } catch (e) {
        console.warn('Could not unlock slot remotely:', e);
      }
      setActiveLock(null);
      setBookingSlotId(null);
      addToast({
        type: 'info',
        title: 'Slot Released',
        message: `Reservation lock for slot ${activeLock.slotNumber} has been released.`,
      });
      setRefreshTrigger((prev) => prev + 1);
    }
  }, [activeLock, sessionId, setActiveLock, addToast]);

  // Lock countdown timer
  useEffect(() => {
    if (!activeLock) {
      setLockSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((new Date(activeLock.expiresAt).getTime() - Date.now()) / 1000));
      setLockSecondsRemaining(diff);

      if (diff <= 0) {
        // Expired!
        setActiveLock(null);
        setBookingSlotId(null);
        addToast({
          type: 'warning',
          title: 'Lock Expired',
          message: 'The 5-minute reservation timer expired. Slot has been returned to available.',
        });
        setRefreshTrigger((prev) => prev + 1);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeLock, setActiveLock, addToast]);

  const reloadUsers = useCallback(async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
      if (!currentUser && data.length > 0) {
        // Default to first user (Kavya)
        setCurrentUser(data[0]);
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  }, [currentUser]);

  const refreshLots = useCallback(async () => {
    try {
      const data = await fetchLots();
      setLots(data);
    } catch (e) {
      console.error('Error fetching lots:', e);
    } finally {
      setLoadingLots(false);
    }
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
    refreshLots();
  }, [refreshLots]);

  // Initial load
  useEffect(() => {
    reloadUsers();
    refreshLots();
  }, [reloadUsers, refreshLots]);

  // Real-time slot count update: Poll every 5 seconds as requested in prompt!
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger((prev) => prev + 1);
      refreshLots();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshLots]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        reloadUsers,
        currentView,
        setCurrentView,
        selectedLotId,
        setSelectedLotId,
        bookingSlotId,
        setBookingSlotId,
        activeLock,
        setActiveLock,
        lockSecondsRemaining,
        releaseActiveLock,
        sessionId,
        refreshTrigger,
        triggerRefresh,
        toasts,
        addToast,
        removeToast,
        lots,
        loadingLots,
        refreshLots,
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
