import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { RefreshCw, CheckCircle2, AlertCircle, X, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const opLabels: Record<string, string> = {
    addCustomer: 'ثبت مشتری جدید',
    updateCustomer: 'بروزرسانی اطلاعات مشتری',
    deleteCustomer: 'حذف مشتری',
    addManagedCompany: 'ثبت شرکت جدید',
    updateManagedCompany: 'بروزرسانی اطلاعات شرکت',
    deleteManagedCompany: 'حذف شرکت',
    addManagedCompanyLedgerEntry: 'ثبت تراکنش شرکت',
    updateManagedCompanyLedgerEntry: 'بروزرسانی تراکنش شرکت',
    deleteManagedCompanyLedgerEntry: 'حذف تراکنش شرکت',
    addManagedCompanyCustomer: 'ثبت مشتری شرکت',
    updateManagedCompanyCustomer: 'بروزرسانی مشتری شرکت',
    deleteManagedCompanyCustomer: 'حذف مشتری شرکت',
    addCustomerBillingRecord: 'ثبت قبض جدید',
    updateCustomerBillingRecord: 'بروزرسانی قبض',
    deleteCustomerBillingRecord: 'حذف قبض',
    addManagedCompanyInvoice: 'ثبت فاکتور شرکت',
    updateManagedCompanyInvoice: 'بروزرسانی فاکتور شرکت',
    deleteManagedCompanyInvoice: 'حذف فاکتور شرکت',
    addManagedCompanyProductionLog: 'ثبت گزارش تولید',
    updateManagedCompanyProductionLog: 'بروزرسانی گزارش تولید',
    deleteManagedCompanyProductionLog: 'حذف گزارش تولید',
    addActivity: 'ثبت فعالیت سیستم',
    logActivity: 'ثبت فعالیت سیستم'
};

export const ConnectivityDot: React.FC = () => {
    const { isOnline } = useAppContext();
    return (
        <div 
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/40 border border-gray-200/50 backdrop-blur-sm shadow-sm"
            title={isOnline ? 'وضعیت آنلاین' : 'وضعیت آفلاین'}
        >
            <span className={`relative flex h-2.5 w-2.5`}>
                {isOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            <span className={`text-[10px] font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'متصل' : 'آفلاین'}
            </span>
        </div>
    );
};

export const SyncStatus: React.FC = () => {
    const { syncQueueSize, isSyncing } = useAppContext();
    const [showModal, setShowModal] = useState(false);

    if (syncQueueSize === 0 && !isSyncing) return null;

    return (
        <>
            <motion.button
                layoutId="sync-indicator"
                onClick={() => setShowModal(true)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 ${
                    isSyncing ? 'bg-blue-600 text-white animate-pulse' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
            >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>{syncQueueSize} مورد</span>
            </motion.button>

            <AnimatePresence>
                {showModal && (
                    <SyncModal onClose={() => setShowModal(false)} />
                )}
            </AnimatePresence>
        </>
    );
};

const SyncModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { syncQueueItems, isSyncing, isOnline } = useAppContext();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                        <RefreshCw className={`text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} size={20} />
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">صف همگام‌سازی</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Queue Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {syncQueueItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <CheckCircle2 size={48} className="text-green-500 mb-4 opacity-50" />
                            <p className="text-slate-600 font-medium tracking-tight">تمامی تغییرات همگام‌سازی شده‌اند.</p>
                            <p className="text-xs text-slate-400 mt-1">تغییرات جدید شما به صورت خودکار در صف قرار می‌گیرند.</p>
                        </div>
                    ) : (
                        <AnimatePresence initial={false}>
                            {syncQueueItems.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50, filter: 'blur(10px)' }}
                                    className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-500 ${
                                        item.status === 'syncing'
                                            ? 'border-blue-200 bg-blue-50/50 shadow-md shadow-blue-100 scale-[1.02] translate-x-1' 
                                            : item.status === 'success'
                                            ? 'border-green-200 bg-green-50 text-green-700'
                                            : item.status === 'error'
                                            ? 'border-red-200 bg-red-50 text-red-700'
                                            : 'border-slate-100 bg-slate-50/30 text-slate-500'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                                            item.status === 'syncing' ? 'bg-blue-600 text-white shadow-lg shadow-blue-400' : 
                                            item.status === 'success' ? 'bg-green-500 text-white' : 
                                            item.status === 'error' ? 'bg-red-500 text-white' :
                                            'bg-slate-200 text-slate-500'
                                        }`}>
                                            {item.status === 'syncing' ? (
                                                <RefreshCw size={16} className="animate-spin" />
                                            ) : item.status === 'success' ? (
                                                <CheckCircle2 size={16} />
                                            ) : item.status === 'error' ? (
                                                <AlertCircle size={16} />
                                            ) : (
                                                <span className="text-[10px] font-bold">{index + 1}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold tracking-tight transition-colors ${
                                                item.status === 'syncing' ? 'text-blue-700' : 
                                                item.status === 'success' ? 'text-green-700' :
                                                item.status === 'error' ? 'text-red-700' :
                                                'text-slate-800'
                                            }`}>
                                                {opLabels[item.type] || item.type}
                                            </p>
                                            <p className="text-[10px] opacity-70">
                                                {new Date(item.timestamp).toLocaleTimeString('fa-IR')}
                                            </p>
                                        </div>
                                    </div>

                                    {item.status === 'syncing' && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></div>
                                        </div>
                                    )}
                                    {item.status === 'success' && (
                                        <motion.div 
                                            initial={{ scale: 0 }} 
                                            animate={{ scale: 1 }} 
                                            className="text-[10px] font-bold bg-green-100 px-2 py-0.5 rounded-full"
                                        >
                                            انجام شد
                                        </motion.div>
                                    )}
                                    {item.status === 'error' && (
                                        <span className="text-[10px] font-bold bg-red-100 px-2 py-0.5 rounded-full">خطا</span>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>

                {/* Footer Info */}
                <div className="p-4 bg-slate-50 border-t border-gray-100 italic text-[11px] text-slate-500 text-center">
                    {!isOnline ? (
                        <div className="flex items-center justify-center gap-1.5 text-amber-600 font-bold">
                            <WifiOff size={14} />
                            <span>به دلیل عدم اتصال به اینترنت، همگام‌سازی متوقف شده است.</span>
                        </div>
                    ) : isSyncing ? (
                        <div className="flex items-center justify-center gap-1.5 text-blue-600 font-bold">
                            <Wifi size={14} />
                            <span>در حال همگام‌سازی خودکار...</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-1.5 text-green-600 font-bold">
                            <Wifi size={14} />
                            <span>آماده برای همگام‌سازی تغییرات جدید.</span>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
