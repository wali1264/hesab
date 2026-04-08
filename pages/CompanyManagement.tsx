
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import type { ManagedCompany, CompanyLedgerEntry, LedgerEntryType, ManagedCompanyCustomer, CustomerBillingRecord, OwnerTransaction, OwnerTransactionType, Shareholder, ManagedCompanyInvoice } from '../types';
import { CompanyType } from '../types';
import { PlusIcon, XIcon, EyeIcon, TrashIcon, UserGroupIcon, EditIcon, BuildingIcon, ArrowLeftIcon, WalletIcon, TrendingUpIcon, TrendingDownIcon, ChartBarIcon, ClipboardDocumentListIcon, CheckCircleIcon, CalendarIcon, PrintIcon, HistoryIcon, CurrencyDollarIcon, ExclamationCircleIcon, MapIcon, MapPinIcon, ArrowPathIcon, LocateIcon } from '../components/icons';
import { formatCurrency, numberToPersianWords } from '../utils/formatters';
import { formatJalaliDate } from '../utils/jalali';
import JalaliDateInput from '../components/JalaliDateInput';
import CompanyPrintModal from '../components/CompanyPrintModal';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
    ResponsiveContainer, 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartsTooltip, 
    Area, 
    AreaChart,
    ReferenceLine
} from 'recharts';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
};

const RegisterLocationModal: React.FC<{ 
    customer: ManagedCompanyCustomer, 
    onClose: () => void, 
    onSave: (lat: number, lng: number) => void 
}> = ({ customer, onClose, onSave }) => {
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [samples, setSamples] = useState<{ lat: number, lng: number, acc: number }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState(10); // Increased for better averaging

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("مرورگر شما از قابلیت مکان‌یابی پشتیبانی نمی‌کند.");
            setLoading(false);
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const newLat = position.coords.latitude;
                const newLng = position.coords.longitude;
                const newAcc = position.coords.accuracy;

                setAccuracy(newAcc);

                // Filter out low accuracy readings (e.g., > 100m)
                if (newAcc < 100) {
                    setSamples(prev => {
                        const newSamples = [...prev, { lat: newLat, lng: newLng, acc: newAcc }].slice(-20); // Keep last 20
                        
                        // Calculate weighted average (more weight to higher accuracy)
                        let totalWeight = 0;
                        let weightedLat = 0;
                        let weightedLng = 0;

                        newSamples.forEach(s => {
                            const weight = 1 / (s.acc + 1); // Avoid division by zero
                            totalWeight += weight;
                            weightedLat += s.lat * weight;
                            weightedLng += s.lng * weight;
                        });

                        setCoords({
                            lat: weightedLat / totalWeight,
                            lng: weightedLng / totalWeight
                        });

                        return newSamples;
                    });
                } else if (samples.length === 0) {
                    // Still show current coords even if accuracy is low initially
                    setCoords({ lat: newLat, lng: newLng });
                }

                setLoading(false);
            },
            (err) => {
                setError("خطا در دریافت موقعیت مکانی. لطفاً دسترسی GPS را بررسی کنید.");
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        const timer = setInterval(() => {
            setCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => {
            navigator.geolocation.clearWatch(watchId);
            clearInterval(timer);
        };
    }, []);

    return (
        <Modal title={`ثبت موقعیت مکانی: ${customer.name}`} onClose={onClose}>
            <div className="space-y-6 text-center">
                {loading ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-600 font-bold">در حال دریافت سیگنال GPS...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-red-700">
                        <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-2" />
                        <p className="font-bold">{error}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                            <MapPinIcon className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-bounce" />
                            <div className="space-y-1">
                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">مختصات میانگین‌گیری شده</p>
                                <p className="text-xl font-black text-slate-800 dir-ltr">
                                    {coords?.lat.toFixed(6)}, {coords?.lng.toFixed(6)}
                                </p>
                                <div className="flex justify-center gap-4 mt-2">
                                    <div className="text-[10px] bg-white/50 px-2 py-1 rounded-lg">
                                        <span className="text-slate-400">دقت:</span>
                                        <span className={`font-bold ml-1 ${accuracy && accuracy < 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {accuracy?.toFixed(1)} متر
                                        </span>
                                    </div>
                                    <div className="text-[10px] bg-white/50 px-2 py-1 rounded-lg">
                                        <span className="text-slate-400">نمونه‌ها:</span>
                                        <span className="font-bold ml-1 text-blue-600">{samples.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {countdown > 0 ? (
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-sm font-bold">
                                لطفاً {countdown} ثانیه صبر کنید تا میانگین‌گیری دقیق‌تر شود...
                            </div>
                        ) : (
                            <button 
                                onClick={() => coords && onSave(coords.lat, coords.lng)}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all transform active:scale-95"
                            >
                                تایید و ثبت نهایی موقعیت
                            </button>
                        )}
                    </div>
                )}
                <p className="text-[10px] text-slate-400">
                    نکته: برای دقت بیشتر، در فضای باز قرار بگیرید و چند لحظه ثابت بمانید.
                </p>
            </div>
        </Modal>
    );
};

const TrackCustomerModal: React.FC<{ 
    customer: ManagedCompanyCustomer, 
    onClose: () => void 
}> = ({ customer, onClose }) => {
    const [userCoords, setUserCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [showDistance, setShowDistance] = useState(true);
    const [followUser, setFollowUser] = useState(true);

    useEffect(() => {
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setUserCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            null,
            { enableHighAccuracy: true, maximumAge: 0 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const MapEvents = () => {
        useMapEvents({
            dragstart: () => setFollowUser(false),
            zoomstart: () => setFollowUser(false),
        });
        return null;
    };

    const MapUpdater = ({ center }: { center: [number, number] }) => {
        const map = useMap();
        useEffect(() => {
            if (followUser) {
                map.setView(center);
            }
        }, [center, map]);
        return null;
    };

    if (!customer.latitude || !customer.longitude) return null;

    const customerPos: [number, number] = [customer.latitude, customer.longitude];
    const userPos: [number, number] | null = userCoords ? [userCoords.lat, userCoords.lng] : null;
    const distance = userCoords ? calculateDistance(userCoords.lat, userCoords.lng, customer.latitude, customer.longitude) : null;

    return (
        <Modal title={`ردیابی مشتری: ${customer.name}`} onClose={onClose}>
            <div className="h-[60vh] md:h-[500px] w-full rounded-2xl overflow-hidden border border-slate-200 relative">
                <MapContainer center={customerPos} zoom={15} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <MapEvents />
                    <Marker position={customerPos}>
                        <Popup>
                            <div className="text-right font-bold">مکان مشتری: {customer.name}</div>
                        </Popup>
                    </Marker>
                    {userPos && (
                        <>
                            <Marker position={userPos} icon={L.divIcon({
                                className: 'custom-div-icon',
                                html: `<div style="background-color: #22c55e; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
                                iconSize: [15, 15],
                                iconAnchor: [7, 7]
                            })}>
                                <Popup>
                                    <div className="text-right font-bold">مکان شما</div>
                                </Popup>
                            </Marker>
                            <MapUpdater center={userPos} />
                        </>
                    )}
                </MapContainer>
                
                {/* Overlay Controls */}
                <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                    <button 
                        onClick={() => {
                            setFollowUser(true);
                            if (userPos) {
                                // Force center if userPos exists
                                // map.setView is handled by MapUpdater when followUser is true
                            }
                        }}
                        className={`p-3 rounded-xl shadow-lg border transition-all ${followUser ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-200'}`}
                        title="موقعیت من"
                    >
                        <LocateIcon className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={() => setShowDistance(!showDistance)}
                        className={`p-3 rounded-xl shadow-lg border transition-all ${showDistance ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-600 border-slate-200'}`}
                        title="نمایش فاصله"
                    >
                        <TrendingUpIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="absolute bottom-4 left-4 right-4 z-[1000] flex flex-col gap-2">
                    {showDistance && distance !== null && (
                        <div className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                            <span className="text-xs font-bold">فاصله تا مشتری:</span>
                            <span className="font-black text-lg">
                                {distance > 1000 ? `${(distance / 1000).toFixed(2)} کیلومتر` : `${Math.round(distance)} متر`}
                            </span>
                        </div>
                    )}
                    <div className="bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-bold text-slate-600">مکان شما (سبز)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                            <span className="text-[10px] font-bold text-slate-600">مکان مشتری (آبی)</span>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const Modal: React.FC<{ title: string, onClose: () => void, children: React.ReactNode, headerActions?: React.ReactNode }> = ({ title, onClose, children, headerActions }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-[100] p-4 pt-12 md:pt-20 overflow-y-auto modal-animate">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden my-0">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                <div className="flex items-center gap-2">
                    {headerActions}
                    <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors"><XIcon className="w-6 h-6" /></button>
                </div>
            </div>
            <div className="p-6 bg-white">{children}</div>
        </div>
    </div>
);

const CompanyManagement: React.FC = () => {
    const { 
        managedCompanies, managedCompanyLedger, managedCompanyCustomers, customerBillingRecords,
        managedCompanyInvoices, managedCompanyProductionLogs,
        ownerTransactions, ownerExpenseCategories, activities,
        addManagedCompany, updateManagedCompany, deleteManagedCompany, 
        addLedgerEntry, updateLedgerEntry, deleteLedgerEntry,
        addManagedCompanyCustomer, updateManagedCompanyCustomer, deleteManagedCompanyCustomer,
        addCustomerBillingRecord, updateCustomerBillingRecord, deleteCustomerBillingRecord,
        addManagedCompanyInvoice, updateManagedCompanyInvoice, deleteManagedCompanyInvoice,
        addManagedCompanyProductionLog, updateManagedCompanyProductionLog, deleteManagedCompanyProductionLog,
        addOwnerTransaction, updateOwnerTransaction, deleteOwnerTransaction,
        addOwnerExpenseCategory, updateOwnerExpenseCategory, deleteOwnerExpenseCategory,
        showToast, storeSettings, hasPermission, hasCompanyAccess, currentUser, logActivity, fetchSectionData
    } = useAppContext();

    useEffect(() => {
        fetchSectionData(['managedCompanies', 'managedLedger', 'managedCustomers', 'managedInvoices', 'managedProductionLogs', 'billingRecords', 'ownerTransactions', 'ownerExpenseCategories', 'activities']);
    }, [fetchSectionData]);
    
    const [activeTab, setActiveTab] = useState<'companies' | 'dashboard' | 'activities' | 'charts'>('companies');
    const [companyDetailTab, setCompanyDetailTab] = useState<'ledger' | 'customers' | 'collections' | 'invoices' | 'production'>('ledger');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const selectedCompany = useMemo(() => managedCompanies.find(c => c.id === selectedCompanyId), [managedCompanies, selectedCompanyId]);

    const redIcon = useMemo(() => new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }), []);

    const debtorsWithCoords = useMemo(() => {
        if (!selectedCompanyId) return [];
        const companyCustomers = managedCompanyCustomers.filter(c => c.companyId === selectedCompanyId && c.latitude && c.longitude);
        const companyBilling = customerBillingRecords.filter(r => r.companyId === selectedCompanyId && r.status === 'unpaid');
        const companyInvoices = managedCompanyInvoices.filter(i => i.companyId === selectedCompanyId && i.status === 'unpaid');
        
        return companyCustomers.map(customer => {
            const unpaidBilling = companyBilling.filter(r => r.customerId === customer.id);
            const unpaidInvoices = companyInvoices.filter(i => i.customerId === customer.id);
            
            const totalUnpaidCount = unpaidBilling.length + unpaidInvoices.length;
            if (totalUnpaidCount === 0) return null;
            
            const totalDebt = unpaidBilling.reduce((sum, r) => sum + r.amount, 0) + 
                              unpaidInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
            
            return {
                ...customer,
                unpaidCount: totalUnpaidCount,
                totalDebt
            };
        }).filter(Boolean) as (ManagedCompanyCustomer & { unpaidCount: number, totalDebt: number })[];
    }, [managedCompanyCustomers, customerBillingRecords, managedCompanyInvoices, selectedCompanyId]);

    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [collectionSearchQuery, setCollectionSearchQuery] = useState('');
    const [historySearchQuery, setHistorySearchQuery] = useState('');
    const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
    const [productionSearchQuery, setProductionSearchQuery] = useState('');
    
    // Pagination for financial columns
    const [visibleExpensesCount, setVisibleExpensesCount] = useState(5);
    const [visibleWaterRevenueCount, setVisibleWaterRevenueCount] = useState(5);
    const [visibleEquipmentRevenueCount, setVisibleEquipmentRevenueCount] = useState(5);
    const [visibleRevenueCount, setVisibleRevenueCount] = useState(5); // For non-water companies
    
    // Activity Filters
    const [activityCompanyFilter, setActivityCompanyFilter] = useState<string>('all');
    const [activityEmployeeFilter, setActivityEmployeeFilter] = useState<string>('all');
    const [activityDateFilter, setActivityDateFilter] = useState<string>('today'); // all, today, yesterday, week, month, year, custom
    const [activityCustomDate, setActivityCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [activitySubTab, setActivitySubTab] = useState<'all' | 'collections' | 'readings' | 'invoices' | 'production'>('all');
    
    // Print State
    const [printRecord, setPrintRecord] = useState<{ record: ManagedCompanyInvoice | CustomerBillingRecord, company: ManagedCompany, customer: ManagedCompanyCustomer } | null>(null);
    
    // Production Dashboard States
    const [productionDateFilter, setProductionDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all' | 'custom'>('today');
    const [productionStartDate, setProductionStartDate] = useState('');
    const [productionEndDate, setProductionEndDate] = useState('');

    // Sales Dashboard States
    const [salesSubTab, setSalesSubTab] = useState<'list' | 'dashboard' | 'map'>('list');
    const [collectionSubTab, setCollectionSubTab] = useState<'list' | 'dashboard' | 'map'>('list');
    const [salesDateFilter, setSalesDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all' | 'custom'>('today');
    const [salesStartDate, setSalesStartDate] = useState('');
    const [salesEndDate, setSalesEndDate] = useState('');
    const [salesEmployeeFilter, setSalesEmployeeFilter] = useState<string>('all');

    const [chartsTimeRange, setChartsTimeRange] = useState<'30days' | '6months' | 'year'>('30days');
    
    // Handle default tab selection based on permissions
    useEffect(() => {
        if (selectedCompanyId && selectedCompany) {
            if (!hasCompanyAccess(selectedCompany?.slotNumber || 0)) {
                setSelectedCompanyId(null);
                showToast("شما به این شرکت دسترسی ندارید.");
                return;
            }
            if (!hasPermission('company:view_ledger')) {
                if (hasPermission('company:view_customers')) {
                    setCompanyDetailTab('customers');
                } else if (hasPermission('company:view_collections')) {
                    setCompanyDetailTab('collections');
                }
            }
            
            // Default tab for non-water companies
            if (selectedCompany?.type !== CompanyType.WATER && companyDetailTab === 'collections') {
                setCompanyDetailTab('invoices');
            }
        }
    }, [selectedCompanyId, selectedCompany, hasPermission, hasCompanyAccess]);
    const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<ManagedCompany | null>(null);
    const [companyType, setCompanyType] = useState<CompanyType>(CompanyType.WATER);
    const [shareholders, setShareholders] = useState<Shareholder[]>([]);
    const [isAddLedgerModalOpen, setIsAddLedgerModalOpen] = useState(false);
    const [editingLedgerEntry, setEditingLedgerEntry] = useState<CompanyLedgerEntry | null>(null);
    const [ledgerEntryType, setLedgerEntryType] = useState<LedgerEntryType>('expense');
    const [ledgerDate, setLedgerDate] = useState(new Date().toISOString().split('T')[0]);

    const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<ManagedCompanyCustomer | null>(null);
    const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedCustomerForBilling, setSelectedCustomerForBilling] = useState<ManagedCompanyCustomer | null>(null);
    const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<ManagedCompanyCustomer | null>(null);
    const [editingBillingRecord, setEditingBillingRecord] = useState<CustomerBillingRecord | null>(null);
    const [billingDate, setBillingDate] = useState(new Date().toISOString().split('T')[0]);

    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [invoiceUnits, setInvoiceUnits] = useState<number>(0);
    const [invoicePricePerUnit, setInvoicePricePerUnit] = useState<number>(0);
    const [selectedCustomerIdForInvoice, setSelectedCustomerIdForInvoice] = useState<string | null>(null);
    const [tempInvoiceCustomerId, setTempInvoiceCustomerId] = useState<string>('guest');
    const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceStatus, setInvoiceStatus] = useState<'paid' | 'unpaid'>('unpaid');

    const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
    const [editingProductionLog, setEditingProductionLog] = useState<any | null>(null);

    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
    const [selectedCustomerForLocation, setSelectedCustomerForLocation] = useState<ManagedCompanyCustomer | null>(null);
    const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);

    const MapController = () => {
        const map = useMap();
        return (
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                <button 
                    onClick={() => {
                        map.locate({ setView: true, maxZoom: 16 });
                    }}
                    className="p-3 bg-white text-slate-600 rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition-all"
                    title="موقعیت من"
                    type="button"
                >
                    <LocateIcon className="w-6 h-6" />
                </button>
            </div>
        );
    };

    // Owner Dashboard States
    const [isOwnerTxModalOpen, setIsOwnerTxModalOpen] = useState(false);
    const [editingOwnerTx, setEditingOwnerTx] = useState<OwnerTransaction | null>(null);
    const [ownerTxType, setOwnerTxType] = useState<OwnerTransactionType>('personal_expense');
    const [ownerTxDate, setOwnerTxDate] = useState(new Date().toISOString().split('T')[0]);

    // Category Management States
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<{ id: string, name: string } | null>(null);
    const [amountInWords, setAmountInWords] = useState('');
    
    useEffect(() => {
        if (isAddCompanyModalOpen) {
            if (editingCompany) {
                setCompanyType(editingCompany.type || CompanyType.WATER);
                setShareholders(editingCompany.shareholders || []);
            } else {
                setCompanyType(CompanyType.WATER);
                setShareholders([{ name: currentUser?.username || 'مدیر', percentage: 100, isCurrentUser: true }]);
            }
        }
    }, [isAddCompanyModalOpen, editingCompany, currentUser]);

    useEffect(() => {
        if (isInvoiceModalOpen) {
            if (editingInvoice) {
                setInvoiceUnits(editingInvoice.units || 0);
                setInvoicePricePerUnit(editingInvoice.pricePerUnit || 0);
            } else {
                setInvoiceUnits(0);
                setInvoicePricePerUnit(selectedCompany?.unitPrice || 0);
            }
        }
    }, [isInvoiceModalOpen, editingInvoice, selectedCompany]);

    if (!hasPermission('page:company_management')) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-slate-500">
                <BuildingIcon className="w-16 h-16 mb-4 opacity-20" />
                <h2 className="text-xl font-bold">شما دسترسی به این بخش را ندارید.</h2>
                <p className="text-sm">لطفاً با مدیر سیستم تماس بگیرید.</p>
            </div>
        );
    }

    const filteredActivities = useMemo(() => {
        let filtered = activities.filter(a => a.type === 'company' || a.companyId);

        // Filter by company access
        filtered = filtered.filter(a => {
            if (!a.companyId) return true;
            const company = managedCompanies.find(c => c.id === a.companyId);
            if (!company) return false;
            return hasCompanyAccess(company.slotNumber);
        });

        // Company Filter
        if (activityCompanyFilter !== 'all') {
            filtered = filtered.filter(a => a.companyId === activityCompanyFilter);
        }

        // Employee Filter
        if (activityEmployeeFilter !== 'all') {
            filtered = filtered.filter(a => a.user === activityEmployeeFilter);
        }

        // Date Filter
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (activityDateFilter === 'today') {
            filtered = filtered.filter(a => a.timestamp.startsWith(todayStr));
        } else if (activityDateFilter === 'yesterday') {
            filtered = filtered.filter(a => a.timestamp.startsWith(yesterdayStr));
        } else if (activityDateFilter === 'week') {
            const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(a => new Date(a.timestamp) >= lastWeek);
        } else if (activityDateFilter === 'month') {
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            filtered = filtered.filter(a => new Date(a.timestamp) >= lastMonth);
        } else if (activityDateFilter === 'year') {
            const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
            filtered = filtered.filter(a => new Date(a.timestamp) >= lastYear);
        } else if (activityDateFilter === 'custom') {
            filtered = filtered.filter(a => a.timestamp.startsWith(activityCustomDate));
        }

        // Sub-tab Filter
        if (activitySubTab === 'collections') {
            filtered = filtered.filter(a => a.description.includes('وصول') || a.description.includes('پرداخت'));
        } else if (activitySubTab === 'readings') {
            filtered = filtered.filter(a => a.description.includes('میترخوانی'));
        }

        return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [activities, activityCompanyFilter, activityEmployeeFilter, activityDateFilter, activityCustomDate, activitySubTab]);

    const activityStats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayActivities = activities.filter(a => a.timestamp.startsWith(today));
        
        return {
            todayReadings: todayActivities.filter(a => a.description.includes('میترخوانی')).length,
            todayCollections: todayActivities.filter(a => a.description.includes('وصول') || a.description.includes('پرداخت')).length,
            todayCollectionAmount: todayActivities
                .filter(a => a.description.includes('وصول') || a.description.includes('پرداخت'))
                .reduce((sum, a) => {
                    const match = a.description.match(/(\d+)/);
                    return sum + (match ? parseInt(match[0]) : 0);
                }, 0)
        };
    }, [activities]);

    const employees = useMemo(() => {
        const uniqueUsers = new Set(activities.map(a => a.user));
        managedCompanyInvoices.forEach(inv => {
            if (inv.registrarName) uniqueUsers.add(inv.registrarName);
            if (inv.collectorName) uniqueUsers.add(inv.collectorName);
        });
        customerBillingRecords.forEach(r => {
            if (r.surveyorName) uniqueUsers.add(r.surveyorName);
            if (r.collectorName) uniqueUsers.add(r.collectorName);
        });
        return Array.from(uniqueUsers);
    }, [activities, managedCompanyInvoices, customerBillingRecords]);
    const companyEntries = useMemo(() => managedCompanyLedger.filter(e => e.companyId === selectedCompanyId), [managedCompanyLedger, selectedCompanyId]);
    const currentCompanyCustomers = useMemo(() => {
        let filtered = managedCompanyCustomers.filter(c => c.companyId === selectedCompanyId);
        if (customerSearchQuery) {
            const query = customerSearchQuery.toLowerCase();
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(query) || 
                c.phone.includes(query) || 
                c.meterNumber.includes(query)
            );
        }
        return filtered;
    }, [managedCompanyCustomers, selectedCompanyId, customerSearchQuery]);

    const currentCompanyBillingRecords = useMemo(() => {
        let filtered = customerBillingRecords.filter(r => r.companyId === selectedCompanyId);
        if (collectionSearchQuery) {
            const query = collectionSearchQuery.toLowerCase();
            filtered = filtered.filter(r => {
                const customer = managedCompanyCustomers.find(c => c.id === r.customerId);
                return customer?.name.toLowerCase().includes(query) || 
                       customer?.meterNumber.includes(query) ||
                       customer?.phone.includes(query);
            });
        }
        return filtered;
    }, [customerBillingRecords, selectedCompanyId, collectionSearchQuery, managedCompanyCustomers]);

    const companyStats = useMemo(() => {
        return managedCompanies
            .filter(company => hasCompanyAccess(company.slotNumber))
            .map(company => {
            const entries = managedCompanyLedger.filter(e => e.companyId === company.id);
            const billingRecords = customerBillingRecords.filter(r => r.companyId === company.id);
            
            const expenses = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
            const waterRevenue = entries.filter(e => e.type === 'water_revenue').reduce((sum, e) => sum + e.amount, 0);
            const equipmentRevenue = entries.filter(e => e.type === 'equipment_revenue').reduce((sum, e) => sum + e.amount, 0);
            const generalRevenue = entries.filter(e => e.type === 'revenue').reduce((sum, e) => sum + e.amount, 0);
            
            // Total debt from unpaid bills (Keep as statistic only)
            const totalDebt = billingRecords.filter(r => r.status === 'unpaid').reduce((sum, r) => sum + r.amount, 0);

            // Total income now ONLY includes manually registered ledger entries (water, equipment, and general revenue)
            const totalIncome = waterRevenue + equipmentRevenue + generalRevenue;
            const profit = totalIncome - expenses;
            const investmentRecovery = totalIncome - (expenses + (company.establishmentCost || 0));
            return {
                ...company,
                expenses,
                totalIncome,
                profit,
                investmentRecovery,
                totalDebt
            };
        });
    }, [managedCompanies, managedCompanyLedger, customerBillingRecords]);
    
    const companyChartsData = useMemo(() => {
        const now = new Date();
        const days = chartsTimeRange === '30days' ? 30 : chartsTimeRange === '6months' ? 180 : 365;
        
        const dates: string[] = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }

        return managedCompanies
            .filter(company => hasCompanyAccess(company.slotNumber))
            .map(company => {
                const ledgerEntries = managedCompanyLedger.filter(e => e.companyId === company.id);
                const invoices = managedCompanyInvoices.filter(inv => inv.companyId === company.id);
                const billingRecords = customerBillingRecords.filter(r => r.companyId === company.id);
                
                const chartData = dates.map(date => {
                    const dayLedger = ledgerEntries.filter(e => e.date === date);
                    const dayInvoices = invoices.filter(inv => inv.date === date);
                    const dayBilling = billingRecords.filter(r => r.date === date);

                    // Income from ledger (manual entries) - excluding establishment costs
                    const ledgerIncome = dayLedger
                        .filter(e => (e.type === 'water_revenue' || e.type === 'equipment_revenue' || e.type === 'revenue') && 
                                     !e.description.includes('تأسیس') && !e.description.includes('تاسیس'))
                        .reduce((sum, e) => sum + e.amount, 0);
                    
                    // Expenses from ledger - excluding establishment costs
                    const ledgerExpense = dayLedger
                        .filter(e => e.type === 'expense' && 
                                     !e.description.includes('تأسیس') && !e.description.includes('تاسیس'))
                        .reduce((sum, e) => sum + e.amount, 0);

                    // Income from invoices (Sales/Receivables)
                    const invoiceIncome = dayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

                    // Income from billing records (Water bills/Receivables)
                    const billingIncome = dayBilling.reduce((sum, r) => sum + r.amount, 0);

                    return {
                        date,
                        profit: (ledgerIncome + invoiceIncome + billingIncome) - ledgerExpense
                    };
                });

                const totalProfit = chartData.reduce((sum, d) => sum + d.profit, 0);
                
                return {
                    id: company.id,
                    name: company.name,
                    data: chartData,
                    totalProfit
                };
            });
    }, [managedCompanies, managedCompanyLedger, managedCompanyInvoices, customerBillingRecords, chartsTimeRange]);

    const calculateCustomerBalance = (customer: ManagedCompanyCustomer) => {
        const initial = customer.initialBalance || 0;
        const initialAdjusted = customer.initialBalanceType === 'they_request' ? -initial : initial;
        
        const invoices = managedCompanyInvoices.filter(inv => inv.customerId === customer.id && inv.status === 'unpaid');
        const unpaidTotal = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        
        const billingRecords = customerBillingRecords.filter(r => r.customerId === customer.id && r.status === 'unpaid');
        const unpaidBillingTotal = billingRecords.reduce((sum, r) => sum + r.amount, 0);
        
        return initialAdjusted + unpaidTotal + unpaidBillingTotal;
    };

    const filteredProductionLogs = useMemo(() => {
        let filtered = managedCompanyProductionLogs.filter(log => log.companyId === selectedCompanyId);
        
        if (productionSearchQuery) {
            filtered = filtered.filter(log => log.date.includes(productionSearchQuery));
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (productionDateFilter === 'today') {
            filtered = filtered.filter(log => log.date === todayStr);
        } else if (productionDateFilter === 'yesterday') {
            filtered = filtered.filter(log => log.date === yesterdayStr);
        } else if (productionDateFilter === 'week') {
            const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(log => new Date(log.date) >= lastWeek);
        } else if (productionDateFilter === 'month') {
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            filtered = filtered.filter(log => new Date(log.date) >= lastMonth);
        } else if (productionDateFilter === 'year') {
            const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
            filtered = filtered.filter(log => new Date(log.date) >= lastYear);
        } else if (productionDateFilter === 'custom' && productionStartDate && productionEndDate) {
            filtered = filtered.filter(log => log.date >= productionStartDate && log.date <= productionEndDate);
        }

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [managedCompanyProductionLogs, selectedCompanyId, productionSearchQuery, productionDateFilter, productionStartDate, productionEndDate]);

    const productionStats = useMemo(() => {
        const totalProduced = filteredProductionLogs.reduce((sum, log) => sum + log.producedUnits, 0);
        const totalSpoilage = filteredProductionLogs.reduce((sum, log) => sum + log.spoilageUnits, 0);
        const netProduction = totalProduced - totalSpoilage;
        return { totalProduced, totalSpoilage, netProduction };
    }, [filteredProductionLogs]);

    const filteredInvoices = useMemo(() => {
        let filtered = managedCompanyInvoices.filter(inv => inv.companyId === selectedCompanyId);
        
        if (invoiceSearchQuery) {
            filtered = filtered.filter(inv => {
                const customer = managedCompanyCustomers.find(c => c.id === inv.customerId);
                const customerName = customer?.name || 'مشتری گذری';
                return customerName.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) || inv.id.includes(invoiceSearchQuery);
            });
        }

        if (salesEmployeeFilter !== 'all') {
            filtered = filtered.filter(inv => 
                inv.registrarName === salesEmployeeFilter || 
                inv.collectorName === salesEmployeeFilter
            );
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (salesDateFilter === 'today') {
            filtered = filtered.filter(inv => inv.date === todayStr);
        } else if (salesDateFilter === 'yesterday') {
            filtered = filtered.filter(inv => inv.date === yesterdayStr);
        } else if (salesDateFilter === 'week') {
            const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(inv => new Date(inv.date) >= lastWeek);
        } else if (salesDateFilter === 'month') {
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            filtered = filtered.filter(inv => new Date(inv.date) >= lastMonth);
        } else if (salesDateFilter === 'year') {
            const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
            filtered = filtered.filter(inv => new Date(inv.date) >= lastYear);
        } else if (salesDateFilter === 'custom' && salesStartDate && salesEndDate) {
            filtered = filtered.filter(inv => inv.date >= salesStartDate && inv.date <= salesEndDate);
        }

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [managedCompanyInvoices, selectedCompanyId, invoiceSearchQuery, salesDateFilter, salesStartDate, salesEndDate, salesEmployeeFilter, managedCompanyCustomers]);

    const salesStats = useMemo(() => {
        const totalSales = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalCollected = filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalOutstanding = totalSales - totalCollected;
        return { totalSales, totalCollected, totalOutstanding };
    }, [filteredInvoices]);

    const filteredBillingRecords = useMemo(() => {
        let filtered = customerBillingRecords.filter(r => r.companyId === selectedCompanyId);
        
        if (collectionSearchQuery) {
            filtered = filtered.filter(r => {
                const customer = managedCompanyCustomers.find(c => c.id === r.customerId);
                return customer?.name.toLowerCase().includes(collectionSearchQuery.toLowerCase()) || 
                       customer?.meterNumber.includes(collectionSearchQuery) ||
                       customer?.phone.includes(collectionSearchQuery);
            });
        }

        if (salesEmployeeFilter !== 'all') {
            filtered = filtered.filter(r => 
                r.surveyorName === salesEmployeeFilter || 
                r.collectorName === salesEmployeeFilter
            );
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (salesDateFilter === 'today') {
            filtered = filtered.filter(r => r.date === todayStr);
        } else if (salesDateFilter === 'yesterday') {
            filtered = filtered.filter(r => r.date === yesterdayStr);
        } else if (salesDateFilter === 'week') {
            const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(r => new Date(r.date) >= lastWeek);
        } else if (salesDateFilter === 'month') {
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            filtered = filtered.filter(r => new Date(r.date) >= lastMonth);
        } else if (salesDateFilter === 'year') {
            const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
            filtered = filtered.filter(r => new Date(r.date) >= lastYear);
        } else if (salesDateFilter === 'custom' && salesStartDate && salesEndDate) {
            filtered = filtered.filter(r => r.date >= salesStartDate && r.date <= salesEndDate);
        }

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [customerBillingRecords, selectedCompanyId, collectionSearchQuery, salesDateFilter, salesStartDate, salesEndDate, salesEmployeeFilter, managedCompanyCustomers]);

    const billingStats = useMemo(() => {
        const totalSales = filteredBillingRecords.reduce((sum, r) => sum + r.amount, 0);
        const totalCollected = filteredBillingRecords.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0);
        const totalOutstanding = totalSales - totalCollected;
        return { totalSales, totalCollected, totalOutstanding };
    }, [filteredBillingRecords]);

    const handleMarkAsPaid = async (record: CustomerBillingRecord) => {
        const paymentDate = new Date().toISOString().split('T')[0];
        await updateCustomerBillingRecord({
            ...record,
            status: 'paid',
            paymentDate
        });
        await logActivity(
            'company',
            `وصول مبلغ ${formatCurrency(record.amount, storeSettings, 'AFN')} از مشتری ${managedCompanyCustomers.find(c => c.id === record.customerId)?.name || 'نامشخص'}`,
            record.id,
            'company',
            record.companyId
        );
        showToast('مبلغ با موفقیت دریافت شد');
    };

    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

    const handleDeleteCompany = (id: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'حذف شرکت',
            message: `آیا از حذف شرکت "${name}" اطمینان دارید؟`,
            onConfirm: async () => {
                await deleteManagedCompany(id);
                await logActivity('company', `حذف شرکت: ${name}`, id, 'company');
                showToast('شرکت با موفقیت حذف شد');
                setConfirmModal(null);
            }
        });
    };

    const handleDeleteLedgerEntry = (id: string, description: string, companyId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'حذف رکورد دفتر کل',
            message: `آیا از حذف این رکورد اطمینان دارید؟`,
            onConfirm: async () => {
                await deleteLedgerEntry(id);
                await logActivity('company', `حذف رکورد دفتر کل: ${description}`, id, 'company', companyId);
                showToast('رکورد با موفقیت حذف شد');
                setConfirmModal(null);
            }
        });
    };

    const handleDeleteCustomer = (id: string, name: string, companyId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'حذف مشتری',
            message: `آیا از حذف مشتری "${name}" اطمینان دارید؟`,
            onConfirm: async () => {
                await deleteManagedCompanyCustomer(id);
                await logActivity('company', `حذف مشتری: ${name}`, id, 'company', companyId);
                showToast('مشتری با موفقیت حذف شد');
                setConfirmModal(null);
            }
        });
    };

    const handleDeleteBillingRecord = (id: string, customerName: string, companyId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'حذف رکورد میترخوانی',
            message: `آیا از حذف این رکورد میترخوانی برای "${customerName}" اطمینان دارید؟`,
            onConfirm: async () => {
                await deleteCustomerBillingRecord(id);
                await logActivity('company', `حذف رکورد میترخوانی: ${customerName}`, id, 'company', companyId);
                showToast('رکورد با موفقیت حذف شد');
                setConfirmModal(null);
            }
        });
    };

    const addShareholder = () => {
        setShareholders([...shareholders, { name: '', percentage: 0, isCurrentUser: false }]);
    };

    const removeShareholder = (index: number) => {
        setShareholders(shareholders.filter((_, i) => i !== index));
    };

    const updateShareholder = (index: number, updates: Partial<Shareholder>) => {
        const newShareholders = [...shareholders];
        newShareholders[index] = { ...newShareholders[index], ...updates };
        setShareholders(newShareholders);
    };

    const handleAddCompany = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        // Validate total percentage
        const totalPercentage = shareholders.reduce((sum, s) => sum + s.percentage, 0);
        if (totalPercentage !== 100) {
            showToast("مجموع درصد سهام باید دقیقاً ۱۰۰ باشد.");
            return;
        }

        const companyData = {
            name: formData.get('name') as string,
            managerName: formData.get('managerName') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
            establishmentCost: Number(formData.get('establishmentCost')) || 0,
            unitPrice: Number(formData.get('unitPrice')) || 0,
            unitName: formData.get('unitName') as string || undefined,
            type: companyType,
            shareholders: shareholders
        };

        if (editingCompany) {
            await updateManagedCompany({ ...editingCompany, ...companyData });
            await logActivity('company', `ویرایش اطلاعات شرکت: ${companyData.name}`, editingCompany.id, 'company', editingCompany.id);
        } else {
            await addManagedCompany(companyData);
            await logActivity('company', `ثبت شرکت جدید: ${companyData.name}`, undefined, 'company');
        }
        setIsAddCompanyModalOpen(false);
        setEditingCompany(null);
    };

    const handleAddLedgerEntry = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCompanyId) return;
        const formData = new FormData(e.currentTarget);
        const entryData = {
            companyId: selectedCompanyId,
            type: ledgerEntryType,
            amount: Number(formData.get('amount')),
            description: formData.get('description') as string,
            date: ledgerDate,
        };

        if (editingLedgerEntry) {
            await updateLedgerEntry({ ...editingLedgerEntry, ...entryData });
            await logActivity('company', `ویرایش رکورد دفتر کل: ${entryData.description}`, editingLedgerEntry.id, 'company', selectedCompanyId);
        } else {
            await addLedgerEntry(entryData);
            await logActivity('company', `ثبت رکورد جدید در دفتر کل: ${entryData.description} (${formatCurrency(entryData.amount, storeSettings, 'AFN')})`, undefined, 'company', selectedCompanyId);
        }
        setIsAddLedgerModalOpen(false);
        setEditingLedgerEntry(null);
    };

    const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCompanyId || !selectedCompany) return;
        const formData = new FormData(e.currentTarget);
        
        const isWaterCompany = selectedCompany?.type === CompanyType.WATER;
        
        const customerData: any = {
            companyId: selectedCompanyId,
            name: formData.get('name') as string,
            fatherName: formData.get('fatherName') as string,
            address: formData.get('address') as string,
            phone: formData.get('phone') as string,
            registrationDate: new Date().toISOString().split('T')[0],
        };

        if (isWaterCompany) {
            customerData.meterNumber = formData.get('meterNumber') as string;
            customerData.initialReading = Number(formData.get('initialReading'));
        } else {
            customerData.initialBalance = Number(formData.get('initialBalance')) || 0;
            customerData.initialBalanceType = formData.get('initialBalanceType') as 'we_request' | 'they_request';
            customerData.customerType = 'invoiced';
        }

        if (editingCustomer) {
            await updateManagedCompanyCustomer({ ...editingCustomer, ...customerData });
            await logActivity('company', `ویرایش اطلاعات مشتری: ${customerData.name}`, editingCustomer.id, 'company', selectedCompanyId);
        } else {
            await addManagedCompanyCustomer(customerData);
            await logActivity('company', `ثبت مشتری جدید: ${customerData.name}`, undefined, 'company', selectedCompanyId);
        }
        setIsAddCustomerModalOpen(false);
        setEditingCustomer(null);
    };

    const handleSaveLocation = async (lat: number, lng: number) => {
        if (!selectedCustomerForLocation) return;
        const updatedCustomer = {
            ...selectedCustomerForLocation,
            latitude: lat,
            longitude: lng
        };
        const result = await updateManagedCompanyCustomer(updatedCustomer);
        if (result.success) {
            showToast("موقعیت مکانی مشتری با موفقیت ثبت شد.");
            setIsLocationModalOpen(false);
            setSelectedCustomerForLocation(null);
        } else {
            showToast(result.message);
        }
    };

    const handlePrintInvoice = (record: CustomerBillingRecord | ManagedCompanyInvoice) => {
        const company = managedCompanies.find(c => c.id === record.companyId);
        if (!company) return;
        
        let customer: ManagedCompanyCustomer | undefined;
        if (record.customerId === 'guest') {
            customer = {
                id: 'guest',
                name: 'مشتری گذری',
                companyId: record.companyId,
                fatherName: '',
                phone: '',
                address: '',
                customerType: 'invoiced',
                createdAt: new Date().toISOString()
            };
        } else {
            customer = managedCompanyCustomers.find(c => c.id === record.customerId);
        }
        
        if (!customer) return;
        setPrintRecord({ record, company, customer });
    };

    const handleAddBillingRecord = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCompanyId || !selectedCustomerForBilling) return;
        const formData = new FormData(e.currentTarget);
        const currentReading = Number(formData.get('currentReading'));
        const previousReading = Number(formData.get('previousReading'));
        const consumption = currentReading - previousReading;
        
        let amount = consumption * (selectedCompany?.unitPrice || 0);
        let isMinimumFeeApplied = false;
        
        if (amount < 100) {
            amount = 100;
            isMinimumFeeApplied = true;
        }
        
        // Invoices are now independent, previous balance is not carried over
        const previousBalance = 0;
        
        const billingData = {
            companyId: selectedCompanyId,
            customerId: selectedCustomerForBilling.id,
            previousReading,
            currentReading,
            consumption,
            amount,
            previousBalance,
            isMinimumFeeApplied,
            date: billingDate,
            isPaid: formData.get('isPaid') === 'on',
            status: formData.get('isPaid') === 'on' ? 'paid' : 'unpaid' as 'paid' | 'unpaid',
            paymentDate: formData.get('isPaid') === 'on' ? billingDate : undefined,
            surveyorName: currentUser?.username || 'System',
            collectorName: currentUser?.username || 'System',
        };

        if (editingBillingRecord) {
            await updateCustomerBillingRecord({ ...editingBillingRecord, ...billingData });
            await logActivity('company', `ویرایش میترخوانی مشتری: ${selectedCustomerForBilling.name}`, editingBillingRecord.id, 'company', selectedCompanyId);
        } else {
            await addCustomerBillingRecord(billingData);
            await logActivity('company', `ثبت میترخوانی جدید برای مشتری: ${selectedCustomerForBilling.name} (قراءت: ${currentReading})`, undefined, 'company', selectedCompanyId);
        }
        setIsBillingModalOpen(false);
        setEditingBillingRecord(null);
        setSelectedCustomerForBilling(null);
    };

    const handleAddInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCompanyId) return;
        const formData = new FormData(e.currentTarget);
        const invoiceData = {
            companyId: selectedCompanyId,
            customerId: tempInvoiceCustomerId,
            date: invoiceDate,
            units: Number(formData.get('units')),
            pricePerUnit: Number(formData.get('pricePerUnit')),
            totalAmount: Number(formData.get('units')) * Number(formData.get('pricePerUnit')),
            status: invoiceStatus,
            description: formData.get('description') as string,
        };

        if (editingInvoice) {
            await updateManagedCompanyInvoice({ ...editingInvoice, ...invoiceData });
            await logActivity('company', `ویرایش فاکتور: ${invoiceData.totalAmount} افغانی`, editingInvoice.id, 'company', selectedCompanyId);
        } else {
            await addManagedCompanyInvoice(invoiceData);
            await logActivity('company', `ثبت فاکتور جدید: ${invoiceData.totalAmount} افغانی`, undefined, 'company', selectedCompanyId);
        }
        setIsInvoiceModalOpen(false);
        setEditingInvoice(null);
    };

    const handleAddProductionLog = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCompanyId) return;
        const formData = new FormData(e.currentTarget);
        const logData = {
            companyId: selectedCompanyId,
            date: productionDate,
            producedUnits: Number(formData.get('producedUnits')),
            spoilageUnits: Number(formData.get('spoilageUnits')),
            description: formData.get('description') as string,
        };

        if (editingProductionLog) {
            await updateManagedCompanyProductionLog({ ...editingProductionLog, ...logData });
            await logActivity('company', `ویرایش رکورد تولید: ${logData.date}`, editingProductionLog.id, 'company', selectedCompanyId);
        } else {
            await addManagedCompanyProductionLog(logData);
            await logActivity('company', `ثبت تولید جدید: ${logData.producedUnits} واحد`, undefined, 'company', selectedCompanyId);
        }
        setIsProductionModalOpen(false);
        setEditingProductionLog(null);
    };

    const handleOwnerTxSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const txData = {
            type: ownerTxType,
            amount: Number(formData.get('amount')),
            description: formData.get('description') as string,
            date: ownerTxDate,
            categoryId: formData.get('categoryId') as string || undefined
        };

        if (editingOwnerTx) {
            await updateOwnerTransaction({ ...editingOwnerTx, ...txData });
        } else {
            await addOwnerTransaction(txData);
        }
        setIsOwnerTxModalOpen(false);
        setEditingOwnerTx(null);
    };

    const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;

        if (editingCategory) {
            await updateOwnerExpenseCategory({ id: editingCategory.id, name });
        } else {
            await addOwnerExpenseCategory(name);
        }
        setIsCategoryModalOpen(false);
        setEditingCategory(null);
    };

    const myFinancialShare = useMemo(() => {
        return companyStats.reduce((acc, company) => {
            // Find the current user's share percentage in this company
            const myShare = company.shareholders?.find(s => s.isCurrentUser)?.percentage || 0;
            
            acc.totalProfitShare += (company.profit * myShare) / 100;
            acc.totalCapitalShare += ((company.establishmentCost || 0) * myShare) / 100;
            return acc;
        }, { totalProfitShare: 0, totalCapitalShare: 0 });
    }, [companyStats]);

    const totalCompanyProfit = useMemo(() => {
        return myFinancialShare.totalProfitShare;
    }, [myFinancialShare]);

    const ownerStats = useMemo(() => {
        const expenses = ownerTransactions.filter(t => t.type === 'personal_expense').reduce((sum, t) => sum + t.amount, 0);
        const receivables = ownerTransactions.filter(t => t.type === 'receivable').reduce((sum, t) => sum + t.amount, 0);
        const payables = ownerTransactions.filter(t => t.type === 'payable').reduce((sum, t) => sum + t.amount, 0);
        
        // Net Worth = User's share of profits + User's share of initial capital - personal expenses + receivables - payables
        const netWorth = myFinancialShare.totalProfitShare + myFinancialShare.totalCapitalShare - expenses + receivables - payables;
        
        return { expenses, receivables, payables, netWorth };
    }, [ownerTransactions, myFinancialShare]);

    const { 
        expenses, waterRevenue, equipmentRevenue, generalRevenue, totalExpenses, totalWater, totalEquipment, totalGeneralRevenue 
    } = useMemo(() => {
        if (!selectedCompanyId || !selectedCompany) {
            return { expenses: [], waterRevenue: [], equipmentRevenue: [], generalRevenue: [], totalExpenses: 0, totalWater: 0, totalEquipment: 0, totalGeneralRevenue: 0 };
        }
        const expenses = managedCompanyLedger.filter(e => e.companyId === selectedCompanyId && e.type === 'expense').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const waterRevenue = managedCompanyLedger.filter(e => e.companyId === selectedCompanyId && e.type === 'water_revenue').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const equipmentRevenue = managedCompanyLedger.filter(e => e.companyId === selectedCompanyId && e.type === 'equipment_revenue').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const generalRevenue = managedCompanyLedger.filter(e => e.companyId === selectedCompanyId && e.type === 'revenue').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalWater = waterRevenue.reduce((sum, e) => sum + e.amount, 0);
        const totalEquipment = equipmentRevenue.reduce((sum, e) => sum + e.amount, 0);
        const totalGeneralRevenue = generalRevenue.reduce((sum, e) => sum + e.amount, 0);
        
        return { expenses, waterRevenue, equipmentRevenue, generalRevenue, totalExpenses, totalWater, totalEquipment, totalGeneralRevenue };
    }, [selectedCompanyId, selectedCompany, managedCompanyLedger]);

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
            {selectedCompanyId && selectedCompany ? (
                <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSelectedCompanyId(null)}
                            className="p-2 rounded-xl bg-white/60 backdrop-blur-md border border-gray-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
                        >
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <BuildingIcon className="w-8 h-8 text-blue-600" />
                                {selectedCompany?.name}
                            </h1>
                            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mt-2 w-fit overflow-x-auto max-w-full">
                                {hasPermission('company:view_ledger') && (
                                    <button 
                                        onClick={() => setCompanyDetailTab('ledger')}
                                        className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${companyDetailTab === 'ledger' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        تراکنش‌های مالی
                                    </button>
                                )}
                                {hasPermission('company:view_customers') && (
                                    <button 
                                        onClick={() => setCompanyDetailTab('customers')}
                                        className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${companyDetailTab === 'customers' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        مدیریت مشتریان
                                    </button>
                                )}
                                {selectedCompany?.type === CompanyType.WATER ? (
                                    hasPermission('company:view_collections') && (
                                        <button 
                                            onClick={() => setCompanyDetailTab('collections')}
                                            className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${companyDetailTab === 'collections' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            وصولی‌ها (بدهکاران)
                                        </button>
                                    )
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => setCompanyDetailTab('invoices')}
                                            className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${companyDetailTab === 'invoices' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            فروشات و فاکتورها
                                        </button>
                                        <button 
                                            onClick={() => setCompanyDetailTab('production')}
                                            className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${companyDetailTab === 'production' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            تولیدات روزانه
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {hasPermission('company:view_stats') && (
                            <>
                                <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center min-w-[120px]">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">هزینه تاسیس</span>
                                    <span className="text-lg font-black text-orange-600">
                                        {formatCurrency(selectedCompany?.establishmentCost || 0, storeSettings, 'AFN')}
                                    </span>
                                </div>
                                <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center min-w-[120px]">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">مجموع طلبات</span>
                                    <span className="text-lg font-black text-red-600">
                                        {formatCurrency(
                                            selectedCompany?.type === CompanyType.WATER 
                                                ? (companyStats.find(s => s.id === selectedCompanyId)?.totalDebt || 0)
                                                : managedCompanyInvoices.filter(inv => inv.companyId === selectedCompanyId && inv.status === 'unpaid').reduce((sum, inv) => sum + inv.totalAmount, 0),
                                            storeSettings, 'AFN'
                                        )}
                                    </span>
                                </div>
                                <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center min-w-[120px]">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">سود/ضرر نهایی</span>
                                    <span className={`text-lg font-black ${(totalWater + totalEquipment + totalGeneralRevenue - totalExpenses) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCurrency(
                                            totalWater + totalEquipment + totalGeneralRevenue - totalExpenses, 
                                            storeSettings, 'AFN'
                                        )}
                                    </span>
                                </div>
                                <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center min-w-[120px]">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">وضعیت بازگشت سرمایه</span>
                                    <span className={`text-lg font-black ${(totalWater + totalEquipment + totalGeneralRevenue - totalExpenses - (selectedCompany?.establishmentCost || 0)) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                        {formatCurrency(
                                            totalWater + totalEquipment + totalGeneralRevenue - totalExpenses - (selectedCompany?.establishmentCost || 0), 
                                            storeSettings, 'AFN'
                                        )}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {companyDetailTab === 'ledger' ? (
                    <div className={`grid grid-cols-1 ${selectedCompany?.type === CompanyType.WATER ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
                        {/* Expenses Column */}
                        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-gray-200/60 shadow-xl overflow-hidden flex flex-col h-[70vh]">
                            <div className="p-4 bg-red-50 border-b border-red-100 flex justify-between items-center">
                                <h3 className="font-bold text-red-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    هزینه‌ها
                                </h3>
                                {hasPermission('company:view_ledger') && (
                                    <button 
                                        onClick={() => { setLedgerEntryType('expense'); setEditingLedgerEntry(null); setAmountInWords(''); setIsAddLedgerModalOpen(true); }}
                                        className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                            <div className="flex-grow overflow-y-auto p-2 space-y-2">
                                {expenses.slice(0, visibleExpensesCount).map(entry => (
                                    <div key={entry.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-slate-800">{formatCurrency(entry.amount, storeSettings, 'AFN')}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {hasPermission('company:view_ledger') && (
                                                    <>
                                                        <button onClick={() => { setEditingLedgerEntry(entry); setLedgerEntryType('expense'); setLedgerDate(entry.date); setAmountInWords(numberToPersianWords(entry.amount)); setIsAddLedgerModalOpen(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"><EditIcon className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeleteLedgerEntry(entry.id, entry.description, selectedCompanyId!)} className="p-1 text-red-600 hover:bg-red-50 rounded-md"><TrashIcon className="w-4 h-4" /></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">{entry.description}</p>
                                        <div className="text-[10px] text-slate-400 mt-2 flex justify-end">{formatJalaliDate(entry.date)}</div>
                                    </div>
                                ))}
                                {expenses.length > visibleExpensesCount && (
                                    <button 
                                        onClick={() => setVisibleExpensesCount(prev => prev + 5)}
                                        className="w-full py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-dashed border-blue-200"
                                    >
                                        بارگذاری موارد بیشتر...
                                    </button>
                                )}
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">مجموع هزینه‌ها:</span>
                                    <span className="font-black text-red-600">{formatCurrency(totalExpenses, storeSettings, 'AFN')}</span>
                                </div>
                            </div>
                        </div>

                        {selectedCompany?.type === CompanyType.WATER ? (
                            <>
                                {/* Water Revenue Column */}
                                <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-gray-200/60 shadow-xl overflow-hidden flex flex-col h-[70vh]">
                                    <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                                        <h3 className="font-bold text-blue-700 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            عواید فروش آب
                                        </h3>
                                        {hasPermission('company:view_ledger') && (
                                            <button 
                                                onClick={() => { setLedgerEntryType('water_revenue'); setEditingLedgerEntry(null); setAmountInWords(''); setIsAddLedgerModalOpen(true); }}
                                                className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                                            >
                                                <PlusIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-grow overflow-y-auto p-2 space-y-2">
                                        {waterRevenue.slice(0, visibleWaterRevenueCount).map(entry => (
                                            <div key={entry.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-slate-800">{formatCurrency(entry.amount, storeSettings, 'AFN')}</span>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {hasPermission('company:view_ledger') && (
                                                            <>
                                                                <button onClick={() => { setEditingLedgerEntry(entry); setLedgerEntryType('water_revenue'); setLedgerDate(entry.date); setAmountInWords(numberToPersianWords(entry.amount)); setIsAddLedgerModalOpen(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"><EditIcon className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDeleteLedgerEntry(entry.id, entry.description, selectedCompanyId!)} className="p-1 text-red-600 hover:bg-red-50 rounded-md"><TrashIcon className="w-4 h-4" /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{entry.description}</p>
                                                <div className="text-[10px] text-slate-400 mt-2 flex justify-end">{formatJalaliDate(entry.date)}</div>
                                            </div>
                                        ))}
                                        {waterRevenue.length > visibleWaterRevenueCount && (
                                            <button 
                                                onClick={() => setVisibleWaterRevenueCount(prev => prev + 5)}
                                                className="w-full py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-dashed border-blue-200"
                                            >
                                                بارگذاری موارد بیشتر...
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-4 bg-slate-50 border-t border-slate-100">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500">مجموع عواید آب:</span>
                                            <span className="font-black text-blue-600">{formatCurrency(totalWater, storeSettings, 'AFN')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Equipment Revenue Column */}
                                <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-gray-200/60 shadow-xl overflow-hidden flex flex-col h-[70vh]">
                                    <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
                                        <h3 className="font-bold text-emerald-700 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            عواید فروش تجهیزات
                                        </h3>
                                        {hasPermission('company:view_ledger') && (
                                            <button 
                                                onClick={() => { setLedgerEntryType('equipment_revenue'); setEditingLedgerEntry(null); setAmountInWords(''); setIsAddLedgerModalOpen(true); }}
                                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                                            >
                                                <PlusIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-grow overflow-y-auto p-2 space-y-2">
                                        {equipmentRevenue.slice(0, visibleEquipmentRevenueCount).map(entry => (
                                            <div key={entry.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-slate-800">{formatCurrency(entry.amount, storeSettings, 'AFN')}</span>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {hasPermission('company:view_ledger') && (
                                                            <>
                                                                <button onClick={() => { setEditingLedgerEntry(entry); setLedgerEntryType('equipment_revenue'); setLedgerDate(entry.date); setAmountInWords(numberToPersianWords(entry.amount)); setIsAddLedgerModalOpen(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"><EditIcon className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDeleteLedgerEntry(entry.id, entry.description, selectedCompanyId!)} className="p-1 text-red-600 hover:bg-red-50 rounded-md"><TrashIcon className="w-4 h-4" /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{entry.description}</p>
                                                <div className="text-[10px] text-slate-400 mt-2 flex justify-end">{formatJalaliDate(entry.date)}</div>
                                            </div>
                                        ))}
                                        {equipmentRevenue.length > visibleEquipmentRevenueCount && (
                                            <button 
                                                onClick={() => setVisibleEquipmentRevenueCount(prev => prev + 5)}
                                                className="w-full py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-dashed border-blue-200"
                                            >
                                                بارگذاری موارد بیشتر...
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-4 bg-slate-50 border-t border-slate-100">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500">مجموع عواید تجهیزات:</span>
                                            <span className="font-black text-emerald-600">{formatCurrency(totalEquipment, storeSettings, 'AFN')}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Combined Revenue Column for non-water companies */
                            <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-gray-200/60 shadow-xl overflow-hidden flex flex-col h-[70vh]">
                                <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                                    <h3 className="font-bold text-blue-700 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        عواید متفرقه
                                    </h3>
                                    {hasPermission('company:view_ledger') && (
                                        <button 
                                            onClick={() => { setLedgerEntryType('water_revenue'); setEditingLedgerEntry(null); setAmountInWords(''); setIsAddLedgerModalOpen(true); }}
                                            className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                                        >
                                            <PlusIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex-grow overflow-y-auto p-2 space-y-2">
                                    {[...waterRevenue, ...equipmentRevenue].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, visibleRevenueCount).map(entry => (
                                        <div key={entry.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex justify-between items-start">
                                                <span className="font-bold text-slate-800">{formatCurrency(entry.amount, storeSettings, 'AFN')}</span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {hasPermission('company:view_ledger') && (
                                                        <>
                                                            <button onClick={() => { setEditingLedgerEntry(entry); setLedgerEntryType(entry.type); setLedgerDate(entry.date); setAmountInWords(numberToPersianWords(entry.amount)); setIsAddLedgerModalOpen(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"><EditIcon className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteLedgerEntry(entry.id, entry.description, selectedCompanyId!)} className="p-1 text-red-600 hover:bg-red-50 rounded-md"><TrashIcon className="w-4 h-4" /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">{entry.description}</p>
                                            <div className="text-[10px] text-slate-400 mt-2 flex justify-end">{formatJalaliDate(entry.date)}</div>
                                        </div>
                                    ))}
                                    {[...waterRevenue, ...equipmentRevenue].length > visibleRevenueCount && (
                                        <button 
                                            onClick={() => setVisibleRevenueCount(prev => prev + 5)}
                                            className="w-full py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-dashed border-blue-200"
                                        >
                                            بارگذاری موارد بیشتر...
                                        </button>
                                    )}
                                </div>
                                <div className="p-4 bg-slate-50 border-t border-slate-100">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">مجموع عواید:</span>
                                        <span className="font-black text-blue-600">{formatCurrency(totalWater + totalEquipment, storeSettings, 'AFN')}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : companyDetailTab === 'customers' ? (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <UserGroupIcon className="w-6 h-6 text-blue-600" />
                                لیست مشتریان
                            </h2>
                            <div className="flex gap-2 w-full md:w-auto">
                                <div className="relative flex-grow md:w-64">
                                    <input 
                                        type="text" 
                                        placeholder="جستجو (نام، تلفن، میتر)..." 
                                        value={customerSearchQuery}
                                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                                    />
                                    <EyeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                                {hasPermission('company_customer:create') && (
                                    <button 
                                        onClick={() => { setEditingCustomer(null); setIsAddCustomerModalOpen(true); }}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        ثبت مشتری جدید
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {currentCompanyCustomers.map(customer => {
                                const lastRecord = [...currentCompanyBillingRecords]
                                    .filter(r => r.customerId === customer.id)
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                                
                                return (
                                    <div key={customer.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-slate-800">{customer.name}</h3>
                                                <p className="text-xs text-slate-500">فرزند: {customer.fatherName}</p>
                                                <p className="text-xs text-slate-500">موبایل: {customer.phone}</p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {hasPermission('company_customer:edit') && (
                                                    <button onClick={() => { setEditingCustomer(customer); setIsAddCustomerModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><EditIcon className="w-4 h-4" /></button>
                                                )}
                                                {hasPermission('company_customer:delete') && (
                                                    <button onClick={() => handleDeleteCustomer(customer.id, customer.name, selectedCompanyId!)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><TrashIcon className="w-4 h-4" /></button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2 mb-4">
                                            {selectedCompany?.type === CompanyType.WATER ? (
                                                <>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-400">شماره میتر:</span>
                                                        <span className="font-bold text-slate-700">{customer.meterNumber}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-400">آخرین قراءت:</span>
                                                        <span className="font-bold text-blue-600">{lastRecord ? lastRecord.currentReading : customer.initialReading}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-400">باقی سابق:</span>
                                                        <span className={`font-bold ${customer.initialBalanceType === 'they_request' ? 'text-red-600' : 'text-slate-700'}`}>
                                                            {formatCurrency(customer.initialBalance || 0, storeSettings, 'AFN')} 
                                                            <span className="text-[10px] mr-1">({customer.initialBalanceType === 'they_request' ? 'طلب مشتری' : 'طلب ما'})</span>
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-400 font-bold">باقی فعلی:</span>
                                                        <span className="font-bold text-emerald-600">{formatCurrency(calculateCustomerBalance(customer), storeSettings, 'AFN')}</span>
                                                    </div>
                                                </>
                                            )}
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">آدرس:</span>
                                                <span className="text-slate-700">{customer.address}</span>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100 flex gap-2">
                                            {selectedCompany?.type === CompanyType.WATER ? (
                                                hasPermission('company_billing:create') && (
                                                    <button 
                                                        onClick={() => { 
                                                            setSelectedCustomerForBilling(customer); 
                                                            setEditingBillingRecord(null);
                                                            setIsBillingModalOpen(true); 
                                                        }}
                                                        className="flex-grow flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all"
                                                    >
                                                        <ClipboardDocumentListIcon className="w-4 h-4" />
                                                        ثبت میترخوانی
                                                    </button>
                                                )
                                            ) : (
                                                hasPermission('company_billing:create') && (
                                                    <button 
                                                        onClick={() => { 
                                                            setEditingInvoice(null);
                                                            setSelectedCustomerIdForInvoice(customer.id);
                                                            setTempInvoiceCustomerId(customer.id);
                                                            setInvoiceDate(new Date().toISOString().split('T')[0]);
                                                            setInvoiceStatus('unpaid');
                                                            setInvoiceUnits(0);
                                                            setInvoicePricePerUnit(selectedCompany?.unitPrice || 0);
                                                            setIsInvoiceModalOpen(true); 
                                                        }}
                                                        className="flex-grow flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all"
                                                    >
                                                        <PlusIcon className="w-4 h-4" />
                                                        ثبت فاکتور
                                                    </button>
                                                )
                                            )}
                                            <button 
                                                onClick={() => { 
                                                    setSelectedCustomerForHistory(customer); 
                                                    setIsHistoryModalOpen(true); 
                                                }}
                                                className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"
                                                title="تاریخچه"
                                            >
                                                <HistoryIcon className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => { 
                                                    setSelectedCustomerForLocation(customer); 
                                                    setIsLocationModalOpen(true); 
                                                }}
                                                className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                                                title="ثبت موقعیت مکانی"
                                            >
                                                <MapPinIcon className="w-5 h-5" />
                                            </button>
                                            {customer.latitude && customer.longitude && (
                                                <button 
                                                    onClick={() => { 
                                                        setSelectedCustomerForLocation(customer); 
                                                        setIsTrackModalOpen(true); 
                                                    }}
                                                    className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                                                    title="ردیابی روی نقشه"
                                                >
                                                    <MapIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {currentCompanyCustomers.length === 0 && (
                            <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                <UserGroupIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">هیچ مشتری برای این شرکت ثبت نشده است.</p>
                            </div>
                        )}
                    </div>
                ) : companyDetailTab === 'invoices' ? (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                                <button 
                                    onClick={() => setSalesSubTab('list')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${salesSubTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    لیست فاکتورها
                                </button>
                                <button 
                                    onClick={() => setSalesSubTab('dashboard')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${salesSubTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    گزارش فروش و وصولی
                                </button>
                                <button 
                                    onClick={() => setSalesSubTab('map')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${salesSubTab === 'map' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    ردیابی طلبکاران
                                </button>
                            </div>
                            {salesSubTab === 'list' && (
                                <button 
                                    onClick={() => { 
                                        setEditingInvoice(null); 
                                        setSelectedCustomerIdForInvoice(null); 
                                        setTempInvoiceCustomerId('guest');
                                        setInvoiceDate(new Date().toISOString().split('T')[0]); 
                                        setInvoiceStatus('paid');
                                        setInvoiceUnits(0);
                                        setInvoicePricePerUnit(selectedCompany?.unitPrice || 0);
                                        setIsInvoiceModalOpen(true); 
                                    }}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 w-full md:w-auto"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    ثبت فاکتور جدید
                                </button>
                            )}
                        </div>

                        {salesSubTab === 'map' ? (
                            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[600px] relative">
                                <MapContainer 
                                    center={debtorsWithCoords.length > 0 ? [debtorsWithCoords[0].latitude!, debtorsWithCoords[0].longitude!] : [34.5553, 69.2075]} 
                                    zoom={13} 
                                    style={{ height: '100%', width: '100%', borderRadius: '1.5rem' }}
                                >
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <MapController />
                                    {debtorsWithCoords.map(debtor => (
                                        <Marker 
                                            key={debtor.id} 
                                            position={[debtor.latitude!, debtor.longitude!]}
                                            icon={redIcon}
                                        >
                                            <Popup>
                                                <div className="text-right font-sans">
                                                    <h3 className="font-bold text-slate-800 mb-1">{debtor.name}</h3>
                                                    <p className="text-xs text-slate-500 mb-2">{debtor.address || 'بدون آدرس'}</p>
                                                    <div className="flex justify-between items-center gap-4 bg-red-50 p-2 rounded-lg">
                                                        <span className="text-[10px] font-bold text-red-600 uppercase">بدهی معوق</span>
                                                        <span className="text-sm font-black text-red-700">{formatCurrency(debtor.totalDebt, storeSettings, 'AFN')}</span>
                                                    </div>
                                                    <div className="mt-3 flex flex-col gap-1">
                                                        <div className="flex justify-between text-[10px]">
                                                            <span className="text-slate-400">تلفن:</span>
                                                            <span className="text-slate-600 font-bold">{debtor.phone || '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            </div>
                        ) : salesSubTab === 'dashboard' ? (
                            <div className="space-y-6">
                                {/* Sales Dashboard Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                            <CurrencyDollarIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block">کل فروش</span>
                                            <span className="text-2xl font-black text-slate-800">{formatCurrency(salesStats.totalSales, storeSettings, 'AFN')}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                            <CheckCircleIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block">کل وصولی</span>
                                            <span className="text-2xl font-black text-emerald-600">{formatCurrency(salesStats.totalCollected, storeSettings, 'AFN')}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                                        <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                                            <ExclamationCircleIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block">باقیمانده (طلب)</span>
                                            <span className="text-2xl font-black text-red-600">{formatCurrency(salesStats.totalOutstanding, storeSettings, 'AFN')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sales Filters */}
                                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-end">
                                    <div className="flex-[2] min-w-[200px]">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">بازه زمانی</label>
                                        <select 
                                            value={salesDateFilter}
                                            onChange={(e) => setSalesDateFilter(e.target.value as any)}
                                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="today">امروز</option>
                                            <option value="yesterday">دیروز</option>
                                            <option value="week">هفته اخیر</option>
                                            <option value="month">ماه اخیر</option>
                                            <option value="year">سال اخیر</option>
                                            <option value="all">همه زمان‌ها</option>
                                            <option value="custom">بازه دلخواه</option>
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">فیلتر کارمند</label>
                                        <select 
                                            value={salesEmployeeFilter}
                                            onChange={(e) => setSalesEmployeeFilter(e.target.value)}
                                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="all">همه کارمندان</option>
                                            {employees.map(emp => (
                                                <option key={emp} value={emp}>{emp}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {salesDateFilter === 'custom' && (
                                        <div className="flex gap-2 flex-grow">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">از تاریخ</label>
                                                <JalaliDateInput 
                                                    value={salesStartDate}
                                                    onChange={setSalesStartDate}
                                                    className="w-full p-2 rounded-xl border border-slate-200 text-sm"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">تا تاریخ</label>
                                                <JalaliDateInput 
                                                    value={salesEndDate}
                                                    onChange={setSalesEndDate}
                                                    className="w-full p-2 rounded-xl border border-slate-200 text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="p-4 text-xs font-bold text-slate-500">تاریخ</th>
                                                    <th className="p-4 text-xs font-bold text-slate-500">مشتری</th>
                                                    <th className="p-4 text-xs font-bold text-slate-500">مبلغ کل</th>
                                                    <th className="p-4 text-xs font-bold text-slate-500">وضعیت</th>
                                                    <th className="p-4 text-xs font-bold text-slate-500">ثبت‌کننده</th>
                                                    <th className="p-4 text-xs font-bold text-slate-500">وصول‌کننده</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredInvoices.map(inv => {
                                                    const customer = managedCompanyCustomers.find(c => c.id === inv.customerId);
                                                    return (
                                                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="p-4 text-xs text-slate-600">{formatJalaliDate(inv.date)}</td>
                                                            <td className="p-4 text-sm font-bold text-slate-800">{customer?.name || 'مشتری گذری'}</td>
                                                            <td className="p-4 text-sm font-bold text-blue-600">{formatCurrency(inv.totalAmount, storeSettings, 'AFN')}</td>
                                                            <td className="p-4">
                                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                    {inv.status === 'paid' ? 'پرداخت شده' : 'پرداخت نشده'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-xs text-slate-500">{inv.registrarName || '-'}</td>
                                                            <td className="p-4 text-xs text-slate-500">{inv.collectorName || '-'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                                    <div className="relative flex-grow">
                                        <input 
                                            type="text" 
                                            placeholder="جستجوی فاکتور (نام مشتری، شماره)..." 
                                            value={invoiceSearchQuery}
                                            onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                                        />
                                        <EyeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="p-4 text-xs font-bold text-slate-500">مشتری</th>
                                                    <th className="p-4 text-xs font-bold text-slate-500">تاریخ</th>
                                                    <th className="p-4 text-xs font-bold text-slate-500">{selectedCompany?.unitName || 'تعداد/مقدار'}</th>
                                                    <th className="p-4 text-xs font-bold text-slate-500">مبلغ کل</th>
                                                    <th className="p-4 text-xs font-bold text-slate-500">وضعیت</th>
                                                    <th className="p-4 text-xs font-bold text-slate-500">عملیات</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredInvoices.map(invoice => {
                                                    const customer = managedCompanyCustomers.find(c => c.id === invoice.customerId);
                                                    return (
                                                        <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="p-4">
                                                                <div className="font-bold text-slate-800 text-sm">{customer?.name || 'مشتری گذری'}</div>
                                                            </td>
                                                            <td className="p-4 text-xs text-slate-600">{formatJalaliDate(invoice.date)}</td>
                                                            <td className="p-4 text-xs font-bold text-blue-600">{invoice.units} {selectedCompany?.unitName}</td>
                                                            <td className="p-4 text-sm font-black text-slate-900">{formatCurrency(invoice.totalAmount, storeSettings, 'AFN')}</td>
                                                            <td className="p-4">
                                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {invoice.status === 'paid' ? 'نقد' : 'قرض'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex gap-2">
                                                                    {invoice.status === 'unpaid' && (
                                                                        <button 
                                                                            onClick={async () => {
                                                                                await updateManagedCompanyInvoice({ ...invoice, status: 'paid' });
                                                                                showToast("فاکتور به عنوان پرداخت شده علامت‌گذاری شد.");
                                                                            }}
                                                                            className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-all shadow-sm"
                                                                        >
                                                                            وصول شد
                                                                        </button>
                                                                    )}
                                                                    <button 
                                                                        onClick={() => handlePrintInvoice(invoice)}
                                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                                                        title="چاپ فاکتور"
                                                                    >
                                                                        <PrintIcon className="w-4 h-4" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => { 
                                                                            setEditingInvoice(invoice); 
                                                                            setInvoiceDate(invoice.date); 
                                                                            setInvoiceUnits(invoice.units);
                                                                            setInvoicePricePerUnit(invoice.pricePerUnit);
                                                                            setIsInvoiceModalOpen(true); 
                                                                        }}
                                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                                    >
                                                                        <EditIcon className="w-4 h-4" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={async () => {
                                                                            if (window.confirm("آیا از حذف این فاکتور مطمئن هستید؟")) {
                                                                                await deleteManagedCompanyInvoice(invoice.id);
                                                                                showToast("فاکتور با موفقیت حذف شد.");
                                                                            }
                                                                        }}
                                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                                                    >
                                                                        <TrashIcon className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {filteredInvoices.length === 0 && (
                                        <div className="p-12 text-center text-slate-400 italic">هیچ فاکتوری یافت نشد.</div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ) : companyDetailTab === 'production' ? (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <ChartBarIcon className="w-6 h-6 text-blue-600" />
                                تولیدات روزانه
                            </h2>
                            <div className="flex gap-2 w-full md:w-auto">
                                <button 
                                    onClick={() => { setEditingProductionLog(null); setProductionDate(new Date().toISOString().split('T')[0]); setIsProductionModalOpen(true); }}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    ثبت تولید جدید
                                </button>
                            </div>
                        </div>

                        {/* Production Dashboard Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                    <ChartBarIcon className="w-8 h-8" />
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 block">مجموع تولید</span>
                                    <span className="text-2xl font-black text-slate-800">{productionStats.totalProduced.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                                    <TrendingDownIcon className="w-8 h-8" />
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 block">مجموع ضایعات</span>
                                    <span className="text-2xl font-black text-red-600">{productionStats.totalSpoilage.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                    <TrendingUpIcon className="w-8 h-8" />
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 block">تولید خالص</span>
                                    <span className="text-2xl font-black text-emerald-700">{productionStats.netProduction.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Production Filters */}
                        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-end">
                            <div className="flex-grow min-w-[200px]">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">بازه زمانی</label>
                                <select 
                                    value={productionDateFilter}
                                    onChange={(e) => setProductionDateFilter(e.target.value as any)}
                                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="today">امروز</option>
                                    <option value="yesterday">دیروز</option>
                                    <option value="week">هفته اخیر</option>
                                    <option value="month">ماه اخیر</option>
                                    <option value="year">سال اخیر</option>
                                    <option value="all">همه زمان‌ها</option>
                                    <option value="custom">بازه دلخواه</option>
                                </select>
                            </div>
                            {productionDateFilter === 'custom' && (
                                <div className="flex gap-2 flex-grow">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">از تاریخ</label>
                                        <JalaliDateInput 
                                            value={productionStartDate}
                                            onChange={setProductionStartDate}
                                            className="w-full p-2 rounded-xl border border-slate-200 text-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">تا تاریخ</label>
                                        <JalaliDateInput 
                                            value={productionEndDate}
                                            onChange={setProductionEndDate}
                                            className="w-full p-2 rounded-xl border border-slate-200 text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="p-4 text-xs font-bold text-slate-500">تاریخ</th>
                                            <th className="p-4 text-xs font-bold text-slate-500">تولید کل</th>
                                            <th className="p-4 text-xs font-bold text-slate-500">ضایعات/بازگشتی</th>
                                            <th className="p-4 text-xs font-bold text-slate-500">تولید خالص</th>
                                            <th className="p-4 text-xs font-bold text-slate-500">توضیحات</th>
                                            <th className="p-4 text-xs font-bold text-slate-500">عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredProductionLogs.map(log => (
                                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 text-xs text-slate-600">{formatJalaliDate(log.date)}</td>
                                                    <td className="p-4 text-sm font-bold text-blue-600">{log.producedUnits}</td>
                                                    <td className="p-4 text-sm font-bold text-red-600">{log.spoilageUnits}</td>
                                                    <td className="p-4 text-sm font-black text-slate-900">{log.producedUnits - log.spoilageUnits}</td>
                                                    <td className="p-4 text-xs text-slate-500">{log.description || '---'}</td>
                                                    <td className="p-4">
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => { setEditingProductionLog(log); setProductionDate(log.date); setIsProductionModalOpen(true); }}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                            >
                                                                <EditIcon className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={async () => {
                                                                    if (window.confirm("آیا از حذف این رکورد تولید مطمئن هستید؟")) {
                                                                        await deleteManagedCompanyProductionLog(log.id);
                                                                        showToast("رکورد تولید با موفقیت حذف شد.");
                                                                    }
                                                                }}
                                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                            {managedCompanyProductionLogs.filter(log => log.companyId === selectedCompanyId).length === 0 && (
                                <div className="p-12 text-center text-slate-400 italic">هیچ رکورد تولیدی ثبت نشده است.</div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                                <button 
                                    onClick={() => setCollectionSubTab('list')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${collectionSubTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    لیست وصولی‌ها
                                </button>
                                <button 
                                    onClick={() => setCollectionSubTab('dashboard')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${collectionSubTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    گزارش وصولی و طلبات
                                </button>
                                <button 
                                    onClick={() => setCollectionSubTab('map')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${collectionSubTab === 'map' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    ردیابی طلبکاران
                                </button>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <div className="relative flex-grow md:w-64">
                                    <input 
                                        type="text" 
                                        placeholder="جستجوی مشتری (نام، میتر)..." 
                                        value={collectionSearchQuery}
                                        onChange={(e) => setCollectionSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                                    />
                                    <EyeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>
                        </div>

                        {collectionSubTab === 'dashboard' ? (
                            <div className="space-y-6">
                                {/* Collection Dashboard Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                            <CurrencyDollarIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block">کل فروش (بل‌ها)</span>
                                            <span className="text-2xl font-black text-slate-800">{formatCurrency(salesStats.totalSales, storeSettings, 'AFN')}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                            <CheckCircleIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block">کل وصولی</span>
                                            <span className="text-2xl font-black text-emerald-600">{formatCurrency(salesStats.totalCollected, storeSettings, 'AFN')}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                                        <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                                            <ExclamationCircleIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block">باقیمانده (طلبات)</span>
                                            <span className="text-2xl font-black text-red-600">{formatCurrency(salesStats.totalOutstanding, storeSettings, 'AFN')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Collection Filters */}
                                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-end">
                                    <div className="flex-[2] min-w-[200px]">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">بازه زمانی</label>
                                        <select 
                                            value={salesDateFilter}
                                            onChange={(e) => setSalesDateFilter(e.target.value as any)}
                                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="today">امروز</option>
                                            <option value="yesterday">دیروز</option>
                                            <option value="week">هفته اخیر</option>
                                            <option value="month">ماه اخیر</option>
                                            <option value="year">سال اخیر</option>
                                            <option value="all">همه زمان‌ها</option>
                                            <option value="custom">بازه دلخواه</option>
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">فیلتر کارمند</label>
                                        <select 
                                            value={salesEmployeeFilter}
                                            onChange={(e) => setSalesEmployeeFilter(e.target.value)}
                                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="all">همه کارمندان</option>
                                            {employees.map(emp => (
                                                <option key={emp} value={emp}>{emp}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {salesDateFilter === 'custom' && (
                                        <div className="flex gap-2 flex-grow">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">از تاریخ</label>
                                                <JalaliDateInput 
                                                    value={salesStartDate}
                                                    onChange={setSalesStartDate}
                                                    className="w-full p-2 rounded-xl border border-slate-200 text-sm"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">تا تاریخ</label>
                                                <JalaliDateInput 
                                                    value={salesEndDate}
                                                    onChange={setSalesEndDate}
                                                    className="w-full p-2 rounded-xl border border-slate-200 text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : collectionSubTab === 'map' ? (
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[600px] relative">
                                <MapContainer 
                                    center={debtorsWithCoords.length > 0 ? [debtorsWithCoords[0].latitude!, debtorsWithCoords[0].longitude!] : [34.5553, 69.2075]} 
                                    zoom={13} 
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    {debtorsWithCoords.map(debtor => (
                                        <Marker 
                                            key={debtor.id} 
                                            position={[debtor.latitude!, debtor.longitude!]} 
                                            icon={redIcon}
                                        >
                                            <Popup>
                                                <div className="text-right space-y-2 p-1">
                                                    <div className="font-black text-slate-900 border-b border-slate-100 pb-1">{debtor.name}</div>
                                                    <div className="flex justify-between items-center gap-4">
                                                        <span className="text-[10px] text-slate-500">تعداد فاکتورهای معوق:</span>
                                                        <span className="text-xs font-bold text-red-600">{debtor.unpaidCount}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center gap-4">
                                                        <span className="text-[10px] text-slate-500">مجموع مبلغ بدهی:</span>
                                                        <span className="text-sm font-black text-slate-900">{formatCurrency(debtor.totalDebt, storeSettings, 'AFN')}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedCustomerForLocation(debtor);
                                                            setIsTrackModalOpen(true);
                                                        }}
                                                        className="w-full mt-2 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all"
                                                    >
                                                        مسیریابی و ردیابی
                                                    </button>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                    <MapController />
                                </MapContainer>
                                {debtorsWithCoords.length === 0 && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-[1000]">
                                        <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
                                            <MapIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-500 font-bold">هیچ بدهکاری با موقعیت ثبت شده یافت نشد.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="p-4 text-xs font-bold text-slate-500">مشتری</th>
                                                <th className="p-4 text-xs font-bold text-slate-500">تاریخ بل</th>
                                                <th className="p-4 text-xs font-bold text-slate-500">مصرف (واحد)</th>
                                                <th className="p-4 text-xs font-bold text-slate-500">مبلغ قابل پرداخت</th>
                                                <th className="p-4 text-xs font-bold text-slate-500">وضعیت</th>
                                                <th className="p-4 text-xs font-bold text-slate-500">عملیات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredBillingRecords.map(record => {
                                                const customer = currentCompanyCustomers.find(c => c.id === record.customerId);
                                                return (
                                                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4">
                                                            <div className="font-bold text-slate-800 text-sm">{customer?.name}</div>
                                                            <div className="text-[10px] text-slate-400">میتر: {customer?.meterNumber}</div>
                                                        </td>
                                                        <td className="p-4 text-xs text-slate-600">{formatJalaliDate(record.date)}</td>
                                                        <td className="p-4 text-xs font-bold text-blue-600">{record.consumption}</td>
                                                        <td className="p-4 text-sm font-black text-slate-900">
                                                            {formatCurrency(record.amount, storeSettings, 'AFN')}
                                                            {record.isMinimumFeeApplied && (
                                                                <div className="text-[9px] text-red-500 font-bold mt-0.5">حداقل هزینه</div>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                {record.status === 'paid' ? 'پرداخت شده' : 'در انتظار پرداخت'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex gap-2">
                                                                {record.status === 'unpaid' && hasPermission('company_billing:settle') && (
                                                                    <button 
                                                                        onClick={() => handleMarkAsPaid(record)}
                                                                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-all shadow-sm"
                                                                    >
                                                                        وصول شد
                                                                    </button>
                                                                )}
                                                                <button 
                                                                    onClick={() => handlePrintInvoice(record)}
                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                                    title="چاپ بل"
                                                                >
                                                                    <PrintIcon className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        const customer = managedCompanyCustomers.find(c => c.id === record.customerId);
                                                                        if (customer) {
                                                                            setSelectedCustomerForHistory(customer);
                                                                            setIsHistoryModalOpen(true);
                                                                        }
                                                                    }}
                                                                    className="p-1.5 text-slate-500 hover:bg-slate-50 rounded-lg"
                                                                    title="تاریخچه مشتری"
                                                                >
                                                                    <HistoryIcon className="w-4 h-4" />
                                                                </button>
                                                                {hasPermission('company_billing:delete') && (
                                                                    <button 
                                                                        onClick={() => handleDeleteBillingRecord(record.id, customer?.name || 'نامشخص', selectedCompanyId!)}
                                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                                                        title="حذف"
                                                                    >
                                                                        <TrashIcon className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {filteredBillingRecords.length === 0 && (
                                    <div className="p-12 text-center text-slate-400 italic">هیچ سابقه میترخوانی یافت نشد.</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                </>
            ) : (
                <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <BuildingIcon className="w-10 h-10 text-blue-600" />
                        مدیریت شرکت‌ها
                    </h1>
                    <p className="text-slate-500 mt-1">مدیریت مالی و نظارت بر شرکت‌های تابعه</p>
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <button 
                        onClick={() => setActiveTab('companies')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'companies' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        مدیریت شرکت‌ها
                    </button>
                    {hasPermission('company:view_dashboard') && (
                        <button 
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            سود و زیان کل شرکت‌ها
                        </button>
                    )}
                    {hasPermission('company:view_activities') && (
                        <button 
                            onClick={() => setActiveTab('activities')}
                            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'activities' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            گزارش فعالیت‌ها
                        </button>
                    )}
                    <button 
                        onClick={() => setActiveTab('charts')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'charts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        نمودارها
                    </button>
                </div>
            </div>

            {activeTab === 'companies' && (
                <>
                    <div className="flex justify-end">
                        {hasPermission('company:create') && (
                            <button 
                                onClick={() => { setEditingCompany(null); setAmountInWords(''); setIsAddCompanyModalOpen(true); }}
                                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 group"
                            >
                                <PlusIcon className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                                افزودن شرکت جدید
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {companyStats.map(company => (
                            <div key={company.id} className="bg-white/60 backdrop-blur-md rounded-3xl border border-gray-200/60 shadow-xl overflow-hidden hover:shadow-2xl transition-all group flex flex-col">
                                <div className="p-6 flex-grow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                            <BuildingIcon className="w-8 h-8" />
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-sm mr-2">
                                                اسلات {company.slotNumber}
                                            </div>
                                            {hasPermission('company:edit') && (
                                                <button onClick={() => { setEditingCompany(company); setAmountInWords(numberToPersianWords(company.establishmentCost || 0)); setIsAddCompanyModalOpen(true); }} className="p-2 bg-white rounded-xl border border-slate-100 text-blue-600 hover:bg-blue-50 transition-all shadow-sm"><EditIcon className="w-5 h-5" /></button>
                                            )}
                                            {hasPermission('company:delete') && (
                                                <button onClick={() => handleDeleteCompany(company.id, company.name)} className="p-2 bg-white rounded-xl border border-slate-100 text-red-600 hover:bg-red-50 transition-all shadow-sm"><TrashIcon className="w-5 h-5" /></button>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-1">{company.name}</h3>
                                    <div className="space-y-1 mb-6">
                                        <p className="text-sm text-slate-500 flex items-center gap-2">
                                            <UserGroupIcon className="w-4 h-4" />
                                            {company.managerName}
                                        </p>
                                        <p className="text-xs text-slate-400">{company.phone}</p>
                                    </div>

                                    {hasPermission('company:view_stats') && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">هزینه تاسیس</span>
                                                <span className="text-sm font-bold text-orange-600">{formatCurrency(company.establishmentCost || 0, storeSettings, 'AFN')}</span>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">قیمت فی واحد</span>
                                                <span className="text-sm font-bold text-blue-600">{formatCurrency(company.unitPrice || 0, storeSettings, 'AFN')}</span>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">مجموع هزینه‌ها</span>
                                                <span className="text-sm font-bold text-red-600">{formatCurrency(company.expenses, storeSettings, 'AFN')}</span>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">مجموع عواید</span>
                                                <span className="text-sm font-bold text-blue-600">{formatCurrency(company.totalIncome, storeSettings, 'AFN')}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className={`p-4 flex items-center justify-between ${company.profit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] opacity-70 uppercase font-bold">سود/ضرر خالص</span>
                                        <span className="text-lg font-black">
                                            {hasPermission('company:view_stats') ? formatCurrency(company.profit, storeSettings, 'AFN') : '***'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedCompanyId(company.id)}
                                        className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all"
                                    >
                                        <EyeIcon className="w-5 h-5" />
                                        مشاهده جزئیات
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {activeTab === 'dashboard' && (
                <div className="space-y-8">
                    {/* Owner Dashboard Header Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                    <TrendingUpIcon className="w-6 h-6" />
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">سود کل شرکت‌ها</span>
                            <h3 className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(totalCompanyProfit, storeSettings, 'AFN')}</h3>
                        </div>
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                                    <TrendingDownIcon className="w-6 h-6" />
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">مجموع مصارف شخصی</span>
                            <h3 className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(ownerStats.expenses, storeSettings, 'AFN')}</h3>
                        </div>
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                    <WalletIcon className="w-6 h-6" />
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">مجموع طلبات</span>
                            <h3 className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(ownerStats.receivables, storeSettings, 'AFN')}</h3>
                        </div>
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                                    <TrendingDownIcon className="w-6 h-6" />
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">مجموع بدهی‌ها</span>
                            <h3 className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(ownerStats.payables, storeSettings, 'AFN')}</h3>
                        </div>
                    </div>

                    {/* Net Worth Highlight */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <span className="text-blue-400 font-bold text-sm uppercase tracking-widest">ثروت خالص نهایی (Net Worth)</span>
                                <h2 className="text-5xl font-black mt-2 tracking-tight text-white">
                                    {formatCurrency(ownerStats.netWorth, storeSettings, 'AFN')}
                                </h2>
                                <p className="text-slate-400 mt-2 text-sm">محاسبه شده بر اساس سهم شما از سود و سرمایه شرکت‌ها، طلبات، بدهی‌ها و مصارف شخصی</p>
                            </div>
                            <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10">
                                <ChartBarIcon className="w-12 h-12 text-blue-400" />
                            </div>
                        </div>
                    </div>

                    {/* Transaction Management Sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Personal Expenses */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    مصارف شخصی
                                </h3>
                                <button 
                                    onClick={() => { setOwnerTxType('personal_expense'); setEditingOwnerTx(null); setAmountInWords(''); setIsOwnerTxModalOpen(true); }}
                                    className="p-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-grow overflow-y-auto p-4 space-y-3">
                                {ownerTransactions.filter(t => t.type === 'personal_expense').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => (
                                    <div key={tx.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start">
                                            <span className="font-black text-slate-800">{formatCurrency(tx.amount, storeSettings, 'AFN')}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingOwnerTx(tx); setOwnerTxType('personal_expense'); setOwnerTxDate(tx.date); setAmountInWords(numberToPersianWords(tx.amount)); setIsOwnerTxModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><EditIcon className="w-4 h-4" /></button>
                                                <button onClick={() => deleteOwnerTransaction(tx.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{tx.description}</p>
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                                                {ownerExpenseCategories.find(c => c.id === tx.categoryId)?.name || 'عمومی'}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{formatJalaliDate(tx.date)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Receivables */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    طلبات (طلبکار هستم)
                                </h3>
                                <button 
                                    onClick={() => { setOwnerTxType('receivable'); setEditingOwnerTx(null); setAmountInWords(''); setIsOwnerTxModalOpen(true); }}
                                    className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-grow overflow-y-auto p-4 space-y-3">
                                {ownerTransactions.filter(t => t.type === 'receivable').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => (
                                    <div key={tx.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start">
                                            <span className="font-black text-slate-800">{formatCurrency(tx.amount, storeSettings, 'AFN')}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingOwnerTx(tx); setOwnerTxType('receivable'); setOwnerTxDate(tx.date); setAmountInWords(numberToPersianWords(tx.amount)); setIsOwnerTxModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><EditIcon className="w-4 h-4" /></button>
                                                <button onClick={() => deleteOwnerTransaction(tx.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{tx.description}</p>
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                                                {ownerExpenseCategories.find(c => c.id === tx.categoryId)?.name || 'شخصی'}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{formatJalaliDate(tx.date)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payables */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                    بدهی‌ها (بدهکار هستم)
                                </h3>
                                <button 
                                    onClick={() => { setOwnerTxType('payable'); setEditingOwnerTx(null); setAmountInWords(''); setIsOwnerTxModalOpen(true); }}
                                    className="p-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-grow overflow-y-auto p-4 space-y-3">
                                {ownerTransactions.filter(t => t.type === 'payable').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => (
                                    <div key={tx.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start">
                                            <span className="font-black text-slate-800">{formatCurrency(tx.amount, storeSettings, 'AFN')}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingOwnerTx(tx); setOwnerTxType('payable'); setOwnerTxDate(tx.date); setAmountInWords(numberToPersianWords(tx.amount)); setIsOwnerTxModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><EditIcon className="w-4 h-4" /></button>
                                                <button onClick={() => deleteOwnerTransaction(tx.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{tx.description}</p>
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                                                {ownerExpenseCategories.find(c => c.id === tx.categoryId)?.name || 'شخصی'}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{formatJalaliDate(tx.date)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Category Management Section */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-slate-800">مدیریت دسته‌بندی‌های مصارف شخصی</h3>
                                <p className="text-xs text-slate-500">تعریف دسته‌بندی برای سازماندهی بهتر هزینه‌ها</p>
                            </div>
                            <button 
                                onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }}
                                className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-700 transition-all shadow-lg"
                            >
                                <PlusIcon className="w-5 h-5" />
                                افزودن دسته‌بندی
                            </button>
                        </div>
                        <div className="p-6">
                            {ownerExpenseCategories.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 italic">هیچ دسته‌بندی تعریف نشده است.</div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    {ownerExpenseCategories.map(cat => (
                                        <div key={cat.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
                                            <span className="font-bold text-slate-700 text-sm">{cat.name}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingCategory(cat); setIsCategoryModalOpen(true); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded-md"><EditIcon className="w-4 h-4" /></button>
                                                <button onClick={() => deleteOwnerExpenseCategory(cat.id)} className="p-1 text-red-600 hover:bg-red-100 rounded-md"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'activities' && (
                <div className="space-y-6">
                    {/* Activity Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                <ClipboardDocumentListIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">میترخوانی‌های امروز</span>
                                <span className="text-2xl font-black text-slate-800">{activityStats.todayReadings}</span>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                <CheckCircleIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">وصولی‌های امروز</span>
                                <span className="text-2xl font-black text-slate-800">{activityStats.todayCollections}</span>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                <CurrencyDollarIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">مبلغ وصولی امروز</span>
                                <span className="text-2xl font-black text-emerald-700">{formatCurrency(activityStats.todayCollectionAmount, storeSettings, 'AFN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Filters & Sub-tabs */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">گزارش فعالیت‌های کارمندان</h3>
                                    <p className="text-sm text-slate-500 mt-1">نظارت بر عملکرد کارمندان و تراکنش‌های شرکت‌ها</p>
                                </div>
                                <div className="flex bg-slate-200/50 p-1 rounded-xl">
                                    <button 
                                        onClick={() => setActivitySubTab('all')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activitySubTab === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        همه فعالیت‌ها
                                    </button>
                                    <button 
                                        onClick={() => setActivitySubTab('collections')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activitySubTab === 'collections' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        وصولی‌ها
                                    </button>
                                    <button 
                                        onClick={() => setActivitySubTab('readings')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activitySubTab === 'readings' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        میترخوانی‌ها
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-end">
                                <div className="flex-grow min-w-[150px]">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">فیلتر شرکت</label>
                                    <select 
                                        value={activityCompanyFilter}
                                        onChange={(e) => setActivityCompanyFilter(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">همه شرکت‌ها</option>
                                        {managedCompanies.filter(c => hasCompanyAccess(c.slotNumber)).map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-grow min-w-[150px]">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">فیلتر کارمند</label>
                                    <select 
                                        value={activityEmployeeFilter}
                                        onChange={(e) => setActivityEmployeeFilter(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">همه کارمندان</option>
                                        {employees.map(emp => (
                                            <option key={emp} value={emp}>{emp}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-grow min-w-[150px]">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">بازه زمانی</label>
                                    <select 
                                        value={activityDateFilter}
                                        onChange={(e) => setActivityDateFilter(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="today">امروز</option>
                                        <option value="yesterday">دیروز</option>
                                        <option value="week">هفته اخیر</option>
                                        <option value="month">ماه اخیر</option>
                                        <option value="year">سال اخیر</option>
                                        <option value="all">همه زمان‌ها</option>
                                        <option value="custom">بازه دلخواه</option>
                                    </select>
                                </div>
                                {activityDateFilter === 'custom' && (
                                    <div className="flex-grow min-w-[150px]">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">انتخاب تاریخ</label>
                                        <JalaliDateInput value={activityCustomDate} onChange={setActivityCustomDate} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider">
                                        <th className="p-4 font-bold border-b">کاربر / کارمند</th>
                                        <th className="p-4 font-bold border-b">نوع فعالیت</th>
                                        <th className="p-4 font-bold border-b">توضیحات و جزئیات</th>
                                        <th className="p-4 font-bold border-b">تاریخ و زمان</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredActivities.map(activity => (
                                        <tr key={activity.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-sm">
                                                        {activity.user.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{activity.user}</div>
                                                        <div className="text-[10px] text-slate-400">شناسه کاربر</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                                                        activity.description.includes('وصول') || activity.description.includes('پرداخت')
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                            : activity.description.includes('میترخوانی')
                                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                            : 'bg-slate-50 text-slate-700 border-slate-100'
                                                    }`}>
                                                        {activity.description.includes('وصول') ? 'وصولی' : 
                                                         activity.description.includes('میترخوانی') ? 'میترخوانی' : 
                                                         activity.type === 'company' ? 'مدیریت شرکت' : activity.type}
                                                    </span>
                                                    {(activity.description.includes('مشتری:') || activity.description.includes('برای مشتری:')) && (
                                                        <button 
                                                            onClick={() => {
                                                                const customerNameMatch = activity.description.match(/(?:مشتری:|برای مشتری:)\s*([^()]+)/);
                                                                if (customerNameMatch) {
                                                                    const name = customerNameMatch[1].trim();
                                                                    const customer = managedCompanyCustomers.find(c => c.name === name);
                                                                    if (customer) {
                                                                        setSelectedCompanyId(customer.companyId);
                                                                        setSelectedCustomerForHistory(customer);
                                                                        setIsHistoryModalOpen(true);
                                                                    } else {
                                                                        showToast("مشتری یافت نشد.");
                                                                    }
                                                                }
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors mr-2"
                                                            title="مشاهده تاریخچه مشتری"
                                                        >
                                                            <HistoryIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-slate-700 text-sm font-medium">{activity.description}</div>
                                                {activity.companyId && (
                                                    <div className="text-[10px] text-blue-500 mt-1 flex items-center gap-1">
                                                        <BuildingIcon className="w-3 h-3" />
                                                        {managedCompanies.find(c => c.id === activity.companyId)?.name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-slate-500 text-xs dir-ltr">
                                                <div className="font-bold">{new Date(activity.timestamp).toLocaleTimeString('fa-IR')}</div>
                                                <div className="opacity-70">{new Date(activity.timestamp).toLocaleDateString('fa-IR')}</div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredActivities.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-20 text-center text-slate-400">
                                                <HistoryIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                                                <p className="text-lg font-bold opacity-30">هیچ فعالیتی با این فیلترها یافت نشد.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'charts' && (
                <div className="space-y-8">
                    {/* Charts Header & Filters */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">نبض بازار و سلامت مالی شرکت‌ها</h2>
                            <p className="text-slate-500 mt-1">تحلیل بصری سود و زیان خالص تمامی مجموعه‌ها</p>
                        </div>
                        <div className="flex bg-slate-200/50 p-1 rounded-2xl">
                            <button 
                                onClick={() => setChartsTimeRange('30days')}
                                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${chartsTimeRange === '30days' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                ۳۰ روز اخیر
                            </button>
                            <button 
                                onClick={() => setChartsTimeRange('6months')}
                                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${chartsTimeRange === '6months' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                ۶ ماه اخیر
                            </button>
                            <button 
                                onClick={() => setChartsTimeRange('year')}
                                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${chartsTimeRange === 'year' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                یک سال اخیر
                            </button>
                        </div>
                    </div>

                    {/* Hero Card: Top Performer */}
                    {companyChartsData.length > 0 && companyChartsData.some(c => c.totalProfit > 0) && (
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full -ml-32 -mb-32 blur-3xl"></div>
                            
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                                <div className="flex-grow text-center md:text-right">
                                    <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                                        <TrendingUpIcon className="w-4 h-4" />
                                        برترین عملکرد مالی
                                    </div>
                                    <h3 className="text-4xl font-black mb-2">
                                        {companyChartsData.reduce((prev, current) => (prev.totalProfit > current.totalProfit) ? prev : current).name}
                                    </h3>
                                    <p className="text-blue-100 text-lg">
                                        سود خالص در بازه انتخابی: 
                                        <span className="font-black mr-2 text-white">
                                            {formatCurrency(companyChartsData.reduce((prev, current) => (prev.totalProfit > current.totalProfit) ? prev : current).totalProfit, storeSettings, 'AFN')}
                                        </span>
                                    </p>
                                </div>
                                <div className="w-full md:w-1/2 h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={companyChartsData.reduce((prev, current) => (prev.totalProfit > current.totalProfit) ? prev : current).data}>
                                            <defs>
                                                <linearGradient id="colorProfitHero" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#fff" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#fff" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <RechartsTooltip 
                                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                                formatter={(value: number) => [formatCurrency(value, storeSettings, 'AFN'), 'سود']}
                                                labelFormatter={(label) => `تاریخ: ${label}`}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="profit" 
                                                stroke="#fff" 
                                                strokeWidth={4}
                                                fillOpacity={1} 
                                                fill="url(#colorProfitHero)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* All Companies Charts List */}
                    <div className="grid grid-cols-1 gap-6">
                        {companyChartsData.sort((a, b) => b.totalProfit - a.totalProfit).map((company, index) => (
                            <div key={company.id} className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    <div className="flex items-center gap-4 min-w-[250px]">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-lg">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-slate-800">{company.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs font-black ${company.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {formatCurrency(company.totalProfit, storeSettings, 'AFN')}
                                                </span>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold">سود خالص</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-grow h-24 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={company.data}>
                                                <defs>
                                                    <linearGradient id={`colorProfit-${company.id}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={company.totalProfit >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.1}/>
                                                        <stop offset="95%" stopColor={company.totalProfit >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <RechartsTooltip 
                                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(value: number) => [formatCurrency(value, storeSettings, 'AFN'), 'سود']}
                                                    labelFormatter={(label) => `تاریخ: ${label}`}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="profit" 
                                                    stroke={company.totalProfit >= 0 ? "#10b981" : "#ef4444"} 
                                                    strokeWidth={3}
                                                    fillOpacity={1} 
                                                    fill={`url(#colorProfit-${company.id})`} 
                                                />
                                                <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="3 3" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="flex flex-col items-center md:items-end gap-2 min-w-[120px]">
                                        {company.totalProfit >= 0 ? (
                                            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-black">
                                                <TrendingUpIcon className="w-4 h-4" />
                                                سودآور
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs font-black">
                                                <TrendingDownIcon className="w-4 h-4" />
                                                زیان‌ده
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => setSelectedCompanyId(company.id)}
                                            className="text-blue-600 text-xs font-bold hover:underline"
                                        >
                                            مشاهده جزئیات
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {companyChartsData.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-300">
                            <ChartBarIcon className="w-20 h-20 text-slate-200 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-400">داده‌ای برای نمایش نمودار وجود ندارد.</h3>
                            <p className="text-slate-400 text-sm mt-2">ابتدا تراکنش‌های مالی شرکت‌ها را در دفتر کل ثبت کنید.</p>
                        </div>
                    )}
                </div>
            )}
                </>
            )}

            {isCategoryModalOpen && (
                <Modal 
                    title={editingCategory ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی جدید'} 
                    onClose={() => setIsCategoryModalOpen(false)}
                >
                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">نام دسته‌بندی</label>
                            <input 
                                name="name" 
                                required 
                                defaultValue={editingCategory?.name}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                placeholder="مثلاً: سفر، خوراک، قبض..."
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="w-full p-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg">
                            {editingCategory ? 'بروزرسانی' : 'ثبت دسته‌بندی'}
                        </button>
                    </form>
                </Modal>
            )}

            {isOwnerTxModalOpen && (
                <Modal 
                    title={editingOwnerTx ? 'ویرایش تراکنش شخصی' : 'ثبت تراکنش شخصی جدید'} 
                    onClose={() => setIsOwnerTxModalOpen(false)}
                >
                    <form onSubmit={handleOwnerTxSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">نوع تراکنش</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setOwnerTxType('personal_expense')}
                                    className={`p-2 text-xs rounded-xl border transition-all ${ownerTxType === 'personal_expense' ? 'bg-red-50 border-red-200 text-red-700 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    مصرف شخصی
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setOwnerTxType('receivable')}
                                    className={`p-2 text-xs rounded-xl border transition-all ${ownerTxType === 'receivable' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    طلب (دریافتی)
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setOwnerTxType('payable')}
                                    className={`p-2 text-xs rounded-xl border transition-all ${ownerTxType === 'payable' ? 'bg-orange-50 border-orange-200 text-orange-700 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    بدهی (پرداختی)
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ (افغانی)</label>
                            <input 
                                name="amount" 
                                type="number" 
                                required 
                                defaultValue={editingOwnerTx?.amount}
                                onChange={(e) => setAmountInWords(numberToPersianWords(Number(e.target.value)))}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                placeholder="0"
                            />
                            {amountInWords && <p className="text-xs text-blue-600 mt-1 font-bold">{amountInWords} افغانی</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">دسته بندی (اختیاری)</label>
                            <select 
                                name="categoryId" 
                                defaultValue={editingOwnerTx?.categoryId}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                            >
                                <option value="">انتخاب دسته‌بندی...</option>
                                {ownerExpenseCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1">برای مدیریت دسته‌بندی‌ها به بخش مدیریت دسته‌بندی در داشبورد مراجعه کنید.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ</label>
                            <JalaliDateInput 
                                value={ownerTxDate} 
                                onChange={(val) => setOwnerTxDate(val)} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>
                            <textarea 
                                name="description" 
                                required 
                                defaultValue={editingOwnerTx?.description}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24" 
                                placeholder="شرح تراکنش..."
                            />
                        </div>
                        <button type="submit" className="w-full p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                            {editingOwnerTx ? 'بروزرسانی تراکنش' : 'ثبت تراکنش'}
                        </button>
                    </form>
                </Modal>
            )}

            {isAddCompanyModalOpen && (
                <Modal 
                    title={editingCompany ? 'ویرایش اطلاعات شرکت' : 'ثبت شرکت جدید'} 
                    onClose={() => setIsAddCompanyModalOpen(false)}
                >
                    <form onSubmit={handleAddCompany} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">نوع شرکت</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setCompanyType(CompanyType.WATER)}
                                    className={`p-2 text-xs rounded-xl border transition-all ${companyType === CompanyType.WATER ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    آبرسانی
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setCompanyType(CompanyType.ICE)}
                                    className={`p-2 text-xs rounded-xl border transition-all ${companyType === CompanyType.ICE ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    تولید یخ
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setCompanyType(CompanyType.BOTTLED_WATER)}
                                    className={`p-2 text-xs rounded-xl border transition-all ${companyType === CompanyType.BOTTLED_WATER ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    آب معدنی
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">نام شرکت</label>
                            <input 
                                name="name" 
                                required 
                                defaultValue={editingCompany?.name}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                placeholder="نام شرکت را وارد کنید..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">نام شخص مسئول</label>
                            <input 
                                name="managerName" 
                                required 
                                defaultValue={editingCompany?.managerName}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                placeholder="نام و تخلص..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">شماره تماس</label>
                            <input 
                                name="phone" 
                                required 
                                defaultValue={editingCompany?.phone}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                placeholder="07xx xxx xxx"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">آدرس شرکت</label>
                            <input 
                                name="address" 
                                defaultValue={editingCompany?.address}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                placeholder="آدرس دقیق شرکت..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">هزینه تاسیس (افغانی)</label>
                                <input 
                                    name="establishmentCost" 
                                    type="number"
                                    required 
                                    defaultValue={editingCompany?.establishmentCost}
                                    onChange={(e) => setAmountInWords(numberToPersianWords(Number(e.target.value)))}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {companyType === CompanyType.WATER ? 'قیمت فی واحد آب' : 
                                     companyType === CompanyType.ICE ? 'قیمت فی واحد یخ' : 'قیمت فی واحد گالن'}
                                </label>
                                <input 
                                    name="unitPrice" 
                                    type="number"
                                    required 
                                    defaultValue={editingCompany?.unitPrice}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">نام واحد (اختیاری - مثلاً متر مکعب، قالب، بوتل)</label>
                            <input 
                                name="unitName" 
                                defaultValue={editingCompany?.unitName}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                placeholder="مثلاً: قالب یخ"
                            />
                        </div>
                        {amountInWords && <p className="text-xs text-blue-600 font-bold">{amountInWords} افغانی</p>}

                        <div className="pt-2 border-t border-slate-100">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-sm font-bold text-slate-700">مدیریت شرکا و سهام</label>
                                <button 
                                    type="button" 
                                    onClick={addShareholder}
                                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700"
                                >
                                    <PlusIcon className="w-3 h-3" /> افزودن شریک
                                </button>
                            </div>
                            <div className="space-y-3">
                                {shareholders.map((s, index) => (
                                    <div key={index} className="flex gap-2 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex gap-2">
                                                <input 
                                                    placeholder="نام شریک"
                                                    value={s.name}
                                                    onChange={(e) => updateShareholder(index, { name: e.target.value })}
                                                    className="flex-1 p-2 text-xs rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                                <div className="relative w-24">
                                                    <input 
                                                        type="number"
                                                        placeholder="درصد"
                                                        value={s.percentage}
                                                        onChange={(e) => updateShareholder(index, { percentage: Number(e.target.value) })}
                                                        className="w-full p-2 pr-6 text-xs rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                                                        required
                                                        min="0"
                                                        max="100"
                                                    />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                                                </div>
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox"
                                                    checked={s.isCurrentUser}
                                                    onChange={(e) => {
                                                        const newShareholders = shareholders.map((sh, i) => ({
                                                            ...sh,
                                                            isCurrentUser: i === index ? e.target.checked : false
                                                        }));
                                                        setShareholders(newShareholders);
                                                    }}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-[10px] text-slate-500">این سهم متعلق به من است</span>
                                            </label>
                                        </div>
                                        {shareholders.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => removeShareholder(index)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] text-slate-400">مجموع سهام:</span>
                                    <span className={`text-xs font-bold ${shareholders.reduce((sum, s) => sum + s.percentage, 0) === 100 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {shareholders.reduce((sum, s) => sum + s.percentage, 0)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                            {editingCompany ? 'بروزرسانی اطلاعات' : 'ثبت شرکت'}
                        </button>
                    </form>
                </Modal>
            )}

            {isHistoryModalOpen && selectedCustomerForHistory && (
                <Modal 
                    title={`تاریخچه فاکتورهای ${selectedCustomerForHistory.name}`} 
                    onClose={() => setIsHistoryModalOpen(false)}
                >
                    <div className="space-y-4">
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="جستجو در تاریخچه (تاریخ یا مبلغ)..."
                                value={historySearchQuery}
                                onChange={(e) => setHistorySearchQuery(e.target.value)}
                                className="w-full p-3 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
                            {(() => {
                                const billingRecords = customerBillingRecords
                                    .filter(r => r.customerId === selectedCustomerForHistory.id)
                                    .map(r => ({ ...r, type: 'billing' as const }));
                                
                                const invoices = managedCompanyInvoices
                                    .filter(inv => inv.customerId === selectedCustomerForHistory.id)
                                    .map(inv => ({ ...inv, type: 'invoice' as const }));

                                const combinedHistory = [...billingRecords, ...invoices]
                                    .filter(r => {
                                        const amount = r.type === 'billing' ? (r as any).amount : (r as any).totalAmount;
                                        return r.date.includes(historySearchQuery) || amount.toString().includes(historySearchQuery);
                                    })
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                if (combinedHistory.length === 0) {
                                    return <div className="text-center py-8 text-slate-400 text-sm">هیچ تاریخچه‌ای یافت نشد.</div>;
                                }

                                return combinedHistory.map(record => {
                                    const isBilling = record.type === 'billing';
                                    const amount = isBilling ? (record as any).amount : (record as any).totalAmount;
                                    
                                    return (
                                        <div key={record.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-100 transition-all shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                                                        {isBilling ? 'بل میترخوانی' : 'فاکتور فروش'} | تاریخ: {formatJalaliDate(record.date)}
                                                    </div>
                                                    <div className="text-sm font-black text-slate-800">{formatCurrency(amount, storeSettings, 'AFN')}</div>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {record.status === 'paid' ? 'پرداخت شده' : 'بدهکار'}
                                                </div>
                                            </div>
                                            
                                            {isBilling ? (
                                                <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
                                                    <div className="bg-slate-50 p-2 rounded-lg">
                                                        <span className="text-slate-400 block mb-1">میتر قبلی</span>
                                                        <span className="font-bold text-slate-700">{(record as any).previousReading}</span>
                                                    </div>
                                                    <div className="bg-slate-50 p-2 rounded-lg">
                                                        <span className="text-slate-400 block mb-1">میتر فعلی</span>
                                                        <span className="font-bold text-slate-700">{(record as any).currentReading}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-slate-50 p-2 rounded-lg mb-4 text-[11px]">
                                                    <span className="text-slate-400 block mb-1">جزئیات فروش</span>
                                                    <span className="font-bold text-slate-700">
                                                        {(record as any).units} {selectedCompany?.unitName} (فی واحد: {formatCurrency((record as any).pricePerUnit, storeSettings, 'AFN')})
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                {record.status === 'unpaid' && hasPermission('company_billing:settle') && (
                                                    <button 
                                                        onClick={async () => {
                                                            if (isBilling) {
                                                                await handleMarkAsPaid(record as any);
                                                            } else {
                                                                await updateManagedCompanyInvoice({ ...(record as any), status: 'paid' });
                                                                showToast("فاکتور به عنوان پرداخت شده علامت‌گذاری شد.");
                                                            }
                                                        }}
                                                        className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-700 transition-all shadow-sm"
                                                    >
                                                        وصول شد
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handlePrintInvoice(record as any)}
                                                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold hover:bg-blue-100 transition-all flex items-center gap-1"
                                                >
                                                    <PrintIcon className="w-3 h-3" />
                                                    چاپ فاکتور
                                                </button>
                                                {isBilling && hasPermission('company_billing:edit') && (
                                                    <button 
                                                        onClick={() => {
                                                            setEditingBillingRecord(record as any);
                                                            setSelectedCustomerForBilling(selectedCustomerForHistory);
                                                            setBillingDate(record.date);
                                                            setIsBillingModalOpen(true);
                                                        }}
                                                        className="px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-200 transition-all"
                                                    >
                                                        ویرایش
                                                    </button>
                                                )}
                                                {!isBilling && (
                                                    <button 
                                                        onClick={() => { 
                                                            setEditingInvoice(record as any); 
                                                            setTempInvoiceCustomerId((record as any).customerId);
                                                            setInvoiceDate(record.date); 
                                                            setInvoiceStatus((record as any).status);
                                                            setInvoiceUnits((record as any).units);
                                                            setInvoicePricePerUnit((record as any).pricePerUnit);
                                                            setIsInvoiceModalOpen(true); 
                                                        }}
                                                        className="px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-200 transition-all"
                                                    >
                                                        ویرایش
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </Modal>
            )}

            {isInvoiceModalOpen && (
                <Modal 
                    title={editingInvoice ? 'ویرایش فاکتور' : 'ثبت فاکتور جدید'} 
                    onClose={() => setIsInvoiceModalOpen(false)}
                >
                    <form onSubmit={handleAddInvoice} className="space-y-4">
                        {!selectedCustomerIdForInvoice && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">مشتری</label>
                                <select 
                                    name="customerId" 
                                    required 
                                    value={tempInvoiceCustomerId}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setTempInvoiceCustomerId(val);
                                        if (val === 'guest') {
                                            setInvoiceStatus('paid');
                                        } else {
                                            setInvoiceStatus('unpaid');
                                        }
                                    }}
                                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="guest">مشتری گذری (بدون حساب)</option>
                                    {managedCompanyCustomers
                                        .filter(c => c.companyId === selectedCompanyId)
                                        .map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                </select>
                            </div>
                        )}
                        {selectedCustomerIdForInvoice && (
                            <input type="hidden" name="customerId" value={selectedCustomerIdForInvoice} />
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ</label>
                                <JalaliDateInput value={invoiceDate} onChange={setInvoiceDate} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">وضعیت پرداخت</label>
                                <select 
                                    name="status" 
                                    required 
                                    value={invoiceStatus}
                                    onChange={(e) => setInvoiceStatus(e.target.value as 'paid' | 'unpaid')}
                                    disabled={tempInvoiceCustomerId === 'guest'}
                                    className={`w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 ${tempInvoiceCustomerId === 'guest' ? 'bg-slate-50 text-slate-500' : ''}`}
                                >
                                    <option value="paid">نقد</option>
                                    <option value="unpaid">قرض</option>
                                </select>
                                {tempInvoiceCustomerId === 'guest' && (
                                    <p className="text-[10px] text-blue-600 mt-1 font-bold">فروش به مشتری گذری فقط نقدی است.</p>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{selectedCompany?.unitName || 'تعداد/مقدار'}</label>
                                <input 
                                    name="units" 
                                    type="number" 
                                    required 
                                    value={invoiceUnits || ''}
                                    onChange={(e) => setInvoiceUnits(e.target.value === '' ? 0 : Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">قیمت فی واحد</label>
                                <input 
                                    name="pricePerUnit" 
                                    type="number" 
                                    required 
                                    value={invoicePricePerUnit || ''}
                                    onChange={(e) => setInvoicePricePerUnit(e.target.value === '' ? 0 : Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                            </div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                            <span className="text-sm text-blue-700 font-bold">مبلغ کل فاکتور:</span>
                            <span className="text-xl font-black text-blue-800">{formatCurrency(invoiceUnits * invoicePricePerUnit, storeSettings, 'AFN')}</span>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>
                            <textarea 
                                name="description" 
                                defaultValue={editingInvoice?.description}
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 h-20" 
                                placeholder="توضیحات اختیاری..."
                            />
                        </div>
                        <button type="submit" className="w-full p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg">
                            {editingInvoice ? 'بروزرسانی فاکتور' : 'ثبت فاکتور'}
                        </button>
                    </form>
                </Modal>
            )}

            {isProductionModalOpen && (
                <Modal 
                    title={editingProductionLog ? 'ویرایش رکورد تولید' : 'ثبت تولید جدید'} 
                    onClose={() => setIsProductionModalOpen(false)}
                >
                    <form onSubmit={handleAddProductionLog} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ</label>
                            <JalaliDateInput value={productionDate} onChange={setProductionDate} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">تعداد تولید شده</label>
                                <input 
                                    name="producedUnits" 
                                    type="number" 
                                    required 
                                    defaultValue={editingProductionLog?.producedUnits}
                                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ضایعات/بازگشتی</label>
                                <input 
                                    name="spoilageUnits" 
                                    type="number" 
                                    required 
                                    defaultValue={editingProductionLog?.spoilageUnits || 0}
                                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>
                            <textarea 
                                name="description" 
                                defaultValue={editingProductionLog?.description}
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 h-20" 
                                placeholder="توضیحات اختیاری..."
                            />
                        </div>
                        <button type="submit" className="w-full p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg">
                            {editingProductionLog ? 'بروزرسانی رکورد' : 'ثبت رکورد تولید'}
                        </button>
                    </form>
                </Modal>
            )}

            {isAddLedgerModalOpen && (
                <Modal 
                    title={editingLedgerEntry ? 'ویرایش رکورد' : 'ثبت رکورد جدید'} 
                    onClose={() => setIsAddLedgerModalOpen(false)}
                >
                    <form onSubmit={handleAddLedgerEntry} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">نوع رکورد</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setLedgerEntryType('expense')}
                                    className={`p-2 text-xs rounded-xl border transition-all ${ledgerEntryType === 'expense' ? 'bg-red-50 border-red-200 text-red-700 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    هزینه
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setLedgerEntryType('water_revenue')}
                                    className={`p-2 text-xs rounded-xl border transition-all ${ledgerEntryType === 'water_revenue' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    عواید آب
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setLedgerEntryType('equipment_revenue')}
                                    className={`p-2 text-xs rounded-xl border transition-all ${ledgerEntryType === 'equipment_revenue' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    عواید تجهیزات
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ (افغانی)</label>
                            <input 
                                name="amount" 
                                type="number" 
                                required 
                                defaultValue={editingLedgerEntry?.amount}
                                onChange={(e) => setAmountInWords(numberToPersianWords(Number(e.target.value)))}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                placeholder="0"
                            />
                            {amountInWords && <p className="text-xs text-blue-600 mt-1 font-bold">{amountInWords} افغانی</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ</label>
                            <JalaliDateInput 
                                value={ledgerDate} 
                                onChange={(val) => setLedgerDate(val)} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>
                            <textarea 
                                name="description" 
                                required 
                                defaultValue={editingLedgerEntry?.description}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24" 
                                placeholder="شرح تراکنش..."
                            />
                        </div>
                        <button type="submit" className="w-full p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                            {editingLedgerEntry ? 'بروزرسانی رکورد' : 'ثبت رکورد'}
                        </button>
                    </form>
                </Modal>
            )}

            {isAddCustomerModalOpen && (
                <Modal 
                    title={editingCustomer ? 'ویرایش اطلاعات مشتری' : 'ثبت مشتری جدید'} 
                    onClose={() => setIsAddCustomerModalOpen(false)}
                >
                    <form onSubmit={handleAddCustomer} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">نام مشتری</label>
                                <input name="name" required defaultValue={editingCustomer?.name} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">نام پدر</label>
                                <input name="fatherName" required defaultValue={editingCustomer?.fatherName} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">آدرس</label>
                            <input name="address" required defaultValue={editingCustomer?.address} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {selectedCompany?.type === CompanyType.WATER ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">شماره میتر</label>
                                    <input name="meterNumber" required defaultValue={editingCustomer?.meterNumber} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">نوع تراز (باقی سابق)</label>
                                    <select name="initialBalanceType" required defaultValue={editingCustomer?.initialBalanceType || 'we_request'} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="we_request">ما طلبکاریم (بدهی مشتری)</option>
                                        <option value="they_request">آن‌ها طلبکارند (طلب مشتری)</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">شماره تماس</label>
                                <input name="phone" required defaultValue={editingCustomer?.phone} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        {selectedCompany?.type === CompanyType.WATER ? (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">قراءت اولیه میتر</label>
                                <input name="initialReading" type="number" required defaultValue={editingCustomer?.initialReading} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">باقی سابق (افغانی)</label>
                                <input name="initialBalance" type="number" required defaultValue={editingCustomer?.initialBalance || 0} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                            </div>
                        )}
                        <button type="submit" className="w-full p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg">
                            {editingCustomer ? 'بروزرسانی اطلاعات' : 'ثبت مشتری'}
                        </button>
                    </form>
                </Modal>
            )}

            {isBillingModalOpen && selectedCustomerForBilling && (
                <Modal 
                    title={`ثبت میترخوانی - ${selectedCustomerForBilling.name} (موبایل: ${selectedCustomerForBilling.phone} | میتر: ${selectedCustomerForBilling.meterNumber})`} 
                    onClose={() => setIsBillingModalOpen(false)}
                    headerActions={
                        <button 
                            onClick={() => {
                                setSelectedCustomerForHistory(selectedCustomerForBilling);
                                setIsHistoryModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
                            title="تاریخچه بل‌ها"
                        >
                            <HistoryIcon className="w-5 h-5" />
                        </button>
                    }
                >
                    <form onSubmit={handleAddBillingRecord} className="space-y-4">
                        {(() => {
                            const lastRecord = [...currentCompanyBillingRecords]
                                .filter(r => r.customerId === selectedCustomerForBilling.id)
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                            const prevReading = lastRecord ? lastRecord.currentReading : selectedCustomerForBilling.initialReading;
                            
                            // Calculate current arrears
                            const unpaidRecords = currentCompanyBillingRecords.filter(r => r.customerId === selectedCustomerForBilling.id && r.status === 'unpaid');
                            const arrears = unpaidRecords.reduce((sum, r) => sum + r.amount, 0);
                            
                            return (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">قراءت قبلی</label>
                                            <input name="previousReading" type="number" readOnly value={prevReading} className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">قراءت فعلی</label>
                                            <input name="currentReading" type="number" required defaultValue={editingBillingRecord?.currentReading} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                                        </div>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-blue-700">قیمت فی واحد:</span>
                                            <span className="font-bold text-blue-800">{formatCurrency(selectedCompany?.unitPrice || 0, storeSettings, 'AFN')}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ قراءت</label>
                                        <JalaliDateInput value={billingDate} onChange={setBillingDate} />
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <input type="checkbox" name="isPaid" id="isPaid" defaultChecked={editingBillingRecord?.isPaid} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
                                        <label htmlFor="isPaid" className="text-sm font-bold text-slate-700 cursor-pointer">مبلغ پرداخت شده است</label>
                                    </div>
                                    <button type="submit" className="w-full p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg">
                                        ثبت و محاسبه بل
                                    </button>
                                </>
                            );
                        })()}
                    </form>
                </Modal>
            )}
            {confirmModal?.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4 modal-animate">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden">
                        <div className="p-6 text-center">
                            <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmModal.title}</h3>
                            <p className="text-slate-600 mb-6">{confirmModal.message}</p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setConfirmModal(null)}
                                    className="flex-1 p-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
                                >
                                    انصراف
                                </button>
                                <button 
                                    onClick={confirmModal.onConfirm}
                                    className="flex-1 p-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                                >
                                    تایید و حذف
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isLocationModalOpen && selectedCustomerForLocation && (
                <RegisterLocationModal 
                    customer={selectedCustomerForLocation}
                    onClose={() => { setIsLocationModalOpen(false); setSelectedCustomerForLocation(null); }}
                    onSave={handleSaveLocation}
                />
            )}

            {isTrackModalOpen && selectedCustomerForLocation && (
                <TrackCustomerModal 
                    customer={selectedCustomerForLocation}
                    onClose={() => { setIsTrackModalOpen(false); setSelectedCustomerForLocation(null); }}
                />
            )}

            {printRecord && (
                <CompanyPrintModal 
                    record={printRecord.record}
                    company={printRecord.company}
                    customer={printRecord.customer}
                    onClose={() => setPrintRecord(null)}
                />
            )}
        </div>
    );
};

export default CompanyManagement;
