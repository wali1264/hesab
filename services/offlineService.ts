
import localforage from 'localforage';
import { CustomerBillingRecord, ManagedCompanyInvoice, ActivityLog } from '../types';

// Configure localforage
localforage.config({
    name: 'Kasebyar',
    storeName: 'app_data',
    description: 'Offline storage for Kasebyar App'
});

export interface QueuedOperation {
    id: string;
    type: 'addCustomer' | 'updateCustomer' | 'deleteCustomer' |
          'addSupplier' | 'updateSupplier' | 'deleteSupplier' |
          'addManagedCompany' | 'updateManagedCompany' | 'deleteManagedCompany' |
          'addManagedCompanyLedgerEntry' | 'updateManagedCompanyLedgerEntry' | 'deleteManagedCompanyLedgerEntry' |
          'addManagedCompanyCustomer' | 'updateManagedCompanyCustomer' | 'deleteManagedCompanyCustomer' |
          'addCustomerBillingRecord' | 'updateCustomerBillingRecord' | 'deleteCustomerBillingRecord' |
          'addManagedCompanyInvoice' | 'updateManagedCompanyInvoice' | 'deleteManagedCompanyInvoice' |
          'addManagedCompanyProductionLog' | 'updateManagedCompanyProductionLog' | 'deleteManagedCompanyProductionLog' |
          'addActivity' | 'logActivity';
    payload: any;
    timestamp: number;
}

const STORAGE_KEY_STATE = 'kasebyar_offline_state_v2';
const STORAGE_KEY_QUEUE = 'kasebyar_offline_queue_v2';

export const offlineService = {
    // --- STATE CACHING ---
    saveState: async (state: any) => {
        try {
            // Remove sensitive or non-serializable fields if any
            const { isAuthenticated, currentUser, ...serializableState } = state;
            await localforage.setItem(STORAGE_KEY_STATE, serializableState);
            console.log("State cached successfully in IndexedDB");
        } catch (e) {
            console.error("Failed to cache state:", e);
        }
    },

    loadCachedState: async (): Promise<any | null> => {
        try {
            return await localforage.getItem(STORAGE_KEY_STATE);
        } catch (e) {
            console.error("Failed to load cached state:", e);
            return null;
        }
    },

    // --- QUEUE MANAGEMENT ---
    getQueue: async (): Promise<QueuedOperation[]> => {
        try {
            const queue = await localforage.getItem<QueuedOperation[]>(STORAGE_KEY_QUEUE);
            return queue || [];
        } catch (e) {
            return [];
        }
    },

    addToQueue: async (operation: Omit<QueuedOperation, 'id' | 'timestamp'>) => {
        const queue = await offlineService.getQueue();
        const newOp: QueuedOperation = {
            ...operation,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        };
        queue.push(newOp);
        await localforage.setItem(STORAGE_KEY_QUEUE, queue);
        return newOp;
    },

    removeFromQueue: async (id: string) => {
        const queue = await offlineService.getQueue();
        const filtered = queue.filter(op => op.id !== id);
        await localforage.setItem(STORAGE_KEY_QUEUE, filtered);
    },

    clearQueue: async () => {
        await localforage.removeItem(STORAGE_KEY_QUEUE);
    }
};
