
import { CustomerBillingRecord, ManagedCompanyInvoice, ActivityLog } from '../types';

export interface QueuedOperation {
    id: string;
    type: 'addCustomerBillingRecord' | 'updateCustomerBillingRecord' | 'deleteCustomerBillingRecord' |
          'addManagedCompanyInvoice' | 'updateManagedCompanyInvoice' | 'deleteManagedCompanyInvoice' |
          'addManagedCompanyProductionLog' | 'updateManagedCompanyProductionLog' | 'deleteManagedCompanyProductionLog' |
          'addActivity' | 'logActivity';
    payload: any;
    timestamp: number;
}

const STORAGE_KEY_STATE = 'kasebyar_offline_state';
const STORAGE_KEY_QUEUE = 'kasebyar_offline_queue';

export const offlineService = {
    // --- STATE CACHING ---
    saveState: (state: any) => {
        try {
            // Remove sensitive or non-serializable fields if any
            const { isAuthenticated, currentUser, ...serializableState } = state;
            localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(serializableState));
        } catch (e) {
            console.error("Failed to cache state:", e);
        }
    },

    loadCachedState: (): any | null => {
        const cached = localStorage.getItem(STORAGE_KEY_STATE);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                return null;
            }
        }
        return null;
    },

    // --- QUEUE MANAGEMENT ---
    getQueue: (): QueuedOperation[] => {
        const queue = localStorage.getItem(STORAGE_KEY_QUEUE);
        return queue ? JSON.parse(queue) : [];
    },

    addToQueue: (operation: Omit<QueuedOperation, 'id' | 'timestamp'>) => {
        const queue = offlineService.getQueue();
        const newOp: QueuedOperation = {
            ...operation,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        };
        queue.push(newOp);
        localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
        return newOp;
    },

    removeFromQueue: (id: string) => {
        const queue = offlineService.getQueue();
        const filtered = queue.filter(op => op.id !== id);
        localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(filtered));
    },

    clearQueue: () => {
        localStorage.removeItem(STORAGE_KEY_QUEUE);
    }
};
