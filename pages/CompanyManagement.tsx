
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import type { ManagedCompany, CompanyLedgerEntry, LedgerEntryType, ManagedCompanyCustomer, CustomerBillingRecord, OwnerTransaction, OwnerTransactionType, Shareholder } from '../types';
import { CompanyType } from '../types';
import { PlusIcon, XIcon, EyeIcon, TrashIcon, UserGroupIcon, EditIcon, BuildingIcon, ArrowLeftIcon, WalletIcon, TrendingUpIcon, TrendingDownIcon, ChartBarIcon, ClipboardDocumentListIcon, CheckCircleIcon, CalendarIcon, PrintIcon, HistoryIcon, CurrencyDollarIcon } from '../components/icons';
import { formatCurrency, numberToPersianWords } from '../utils/formatters';
import { formatJalaliDate } from '../utils/jalali';
import JalaliDateInput from '../components/JalaliDateInput';

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
        showToast, storeSettings, hasPermission, hasCompanyAccess, currentUser, logActivity
    } = useAppContext();
    
    const [activeTab, setActiveTab] = useState<'companies' | 'dashboard' | 'activities'>('companies');
    const [companyDetailTab, setCompanyDetailTab] = useState<'ledger' | 'customers' | 'collections' | 'invoices' | 'production'>('ledger');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const selectedCompany = useMemo(() => managedCompanies.find(c => c.id === selectedCompanyId), [managedCompanies, selectedCompanyId]);
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
    const [activityDateFilter, setActivityDateFilter] = useState<string>('all'); // all, today, yesterday, custom
    const [activityCustomDate, setActivityCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [activitySubTab, setActivitySubTab] = useState<'all' | 'collections' | 'readings' | 'invoices' | 'production'>('all');

    // Handle default tab selection based on permissions
    useEffect(() => {
        if (selectedCompanyId && selectedCompany) {
            if (!hasCompanyAccess(selectedCompany.slotNumber)) {
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
            if (selectedCompany.type !== CompanyType.WATER && companyDetailTab === 'collections') {
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
    const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

    const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
    const [editingProductionLog, setEditingProductionLog] = useState<any | null>(null);
    const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);

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
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (activityDateFilter === 'today') {
            filtered = filtered.filter(a => a.timestamp.startsWith(today));
        } else if (activityDateFilter === 'yesterday') {
            filtered = filtered.filter(a => a.timestamp.startsWith(yesterday));
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
        return Array.from(uniqueUsers);
    }, [activities]);
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
            
            // Total debt from unpaid bills (Keep as statistic only)
            const totalDebt = billingRecords.filter(r => r.status === 'unpaid').reduce((sum, r) => sum + r.amount, 0);

            // Total income now ONLY includes manually registered ledger entries
            const totalIncome = waterRevenue + equipmentRevenue;
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

    const handleDeleteCompany = async (id: string, name: string) => {
        if (window.confirm(`آیا از حذف شرکت "${name}" اطمینان دارید؟`)) {
            await deleteManagedCompany(id);
            await logActivity('company', `حذف شرکت: ${name}`, id, 'company');
            showToast('شرکت با موفقیت حذف شد');
        }
    };

    const handleDeleteLedgerEntry = async (id: string, description: string, companyId: string) => {
        if (window.confirm(`آیا از حذف این رکورد اطمینان دارید؟`)) {
            await deleteLedgerEntry(id);
            await logActivity('company', `حذف رکورد دفتر کل: ${description}`, id, 'company', companyId);
            showToast('رکورد با موفقیت حذف شد');
        }
    };

    const handleDeleteCustomer = async (id: string, name: string, companyId: string) => {
        if (window.confirm(`آیا از حذف مشتری "${name}" اطمینان دارید؟`)) {
            await deleteManagedCompanyCustomer(id);
            await logActivity('company', `حذف مشتری: ${name}`, id, 'company', companyId);
            showToast('مشتری با موفقیت حذف شد');
        }
    };

    const handleDeleteBillingRecord = async (id: string, customerName: string, companyId: string) => {
        if (window.confirm(`آیا از حذف این رکورد میترخوانی برای "${customerName}" اطمینان دارید؟`)) {
            await deleteCustomerBillingRecord(id);
            await logActivity('company', `حذف رکورد میترخوانی: ${customerName}`, id, 'company', companyId);
            showToast('رکورد با موفقیت حذف شد');
        }
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
            establishmentCost: Number(formData.get('establishmentCost')) || 0,
            unitPrice: Number(formData.get('unitPrice')) || 0,
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
        if (!selectedCompanyId) return;
        const formData = new FormData(e.currentTarget);
        const customerData = {
            companyId: selectedCompanyId,
            name: formData.get('name') as string,
            fatherName: formData.get('fatherName') as string,
            address: formData.get('address') as string,
            meterNumber: formData.get('meterNumber') as string,
            phone: formData.get('phone') as string,
            initialReading: Number(formData.get('initialReading')),
            registrationDate: new Date().toISOString().split('T')[0],
        };

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

    const handlePrintInvoice = (record: CustomerBillingRecord) => {
        const customer = managedCompanyCustomers.find(c => c.id === record.customerId);
        const company = managedCompanies.find(c => c.id === record.companyId);
        if (!customer || !company) return;

        const totalAmount = record.amount;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html dir="rtl">
            <head>
                <title>بل مصرف آب - ${customer.name}</title>
                <style>
                    @font-face {
                        font-family: 'Inter';
                        src: url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
                    }
                    body { font-family: 'Tahoma', 'Arial', sans-serif; padding: 40px; color: #333; }
                    .invoice-box { max-width: 800px; margin: auto; border: 2px solid #eee; padding: 30px; border-radius: 10px; }
                    .header { display: flex; justify-between; align-items: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 20px; }
                    .company-info h1 { margin: 0; color: #1e40af; font-size: 24px; }
                    .invoice-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .detail-item { margin-bottom: 10px; }
                    .detail-label { font-weight: bold; color: #666; font-size: 14px; }
                    .detail-value { font-size: 16px; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { background: #f8fafc; text-align: right; padding: 12px; border-bottom: 2px solid #e2e8f0; }
                    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
                    .total-section { background: #f1f5f9; padding: 20px; border-radius: 10px; }
                    .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                    .grand-total { font-size: 20px; font-weight: black; color: #1e40af; border-top: 2px solid #cbd5e1; pt-10; margin-top: 10px; }
                    .footer { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; font-size: 12px; }
                    .signature-box { border-top: 1px solid #ccc; padding-top: 10px; margin-top: 40px; }
                    .min-fee-label { color: #dc2626; font-weight: bold; font-size: 12px; margin-top: 5px; }
                    @media print {
                        body { padding: 0; }
                        .invoice-box { border: none; }
                    }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <div class="header">
                        <div class="company-info">
                            <h1>${company.name}</h1>
                            <p>مدیریت آبرسانی و خدمات فنی</p>
                        </div>
                        <div style="text-align: left;">
                            <h2 style="margin: 0; color: #64748b;">بل مصرف آب</h2>
                            <p>تاریخ: ${formatJalaliDate(record.date)}</p>
                        </div>
                    </div>

                    <div class="invoice-details">
                        <div class="detail-item">
                            <div class="detail-label">نام مشترک:</div>
                            <div class="detail-value">${customer.name} فرزند ${customer.fatherName}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">شماره میتر:</div>
                            <div class="detail-value">${customer.meterNumber}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">آدرس:</div>
                            <div class="detail-value">${customer.address}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">شماره تماس:</div>
                            <div class="detail-value">${customer.phone}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>شرح</th>
                                <th>قراءت قبلی</th>
                                <th>قراءت فعلی</th>
                                <th>مصرف (واحد)</th>
                                <th>قیمت واحد</th>
                                <th>مجموع</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>مصرف آب دوره</td>
                                <td>${record.previousReading}</td>
                                <td>${record.currentReading}</td>
                                <td>${record.consumption}</td>
                                <td>${company.unitPrice}</td>
                                <td>${record.amount.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="total-section">
                        <div class="total-row grand-total">
                            <span>قابل پرداخت:</span>
                            <span>${totalAmount.toLocaleString()} افغانی</span>
                        </div>
                        ${record.isMinimumFeeApplied ? `
                            <div class="min-fee-label">
                                * حداقل هزینه خدمات (۱۰۰ افغانی) اعمال شده است.
                            </div>
                        ` : ''}
                        <div style="margin-top: 10px; font-size: 12px; color: #64748b;">
                            مبلغ به حروف: ${numberToPersianWords(totalAmount)} افغانی
                        </div>
                    </div>

                    <div class="footer">
                        <div class="signature-box">
                            <strong>نام میترخوان:</strong><br/>
                            ${record.surveyorName || '---'}
                        </div>
                        <div class="signature-box">
                            <strong>نام تحصیلدار:</strong><br/>
                            ${record.collectorName || '---'}
                        </div>
                        <div class="signature-box">
                            <strong>مهر و امضاء شرکت:</strong><br/>
                        </div>
                    </div>
                </div>
                <script>
                    window.onload = () => {
                        window.print();
                        // window.close(); // Optional: close after printing
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
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
            customerId: formData.get('customerId') as string,
            date: invoiceDate,
            quantity: Number(formData.get('quantity')),
            unitPrice: Number(formData.get('unitPrice')),
            totalAmount: Number(formData.get('quantity')) * Number(formData.get('unitPrice')),
            status: formData.get('status') as 'paid' | 'unpaid',
            notes: formData.get('notes') as string,
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
            totalProduced: Number(formData.get('totalProduced')),
            wasteCount: Number(formData.get('wasteCount')),
            notes: formData.get('notes') as string,
        };

        if (editingProductionLog) {
            await updateManagedCompanyProductionLog({ ...editingProductionLog, ...logData });
            await logActivity('company', `ویرایش رکورد تولید: ${logData.date}`, editingProductionLog.id, 'company', selectedCompanyId);
        } else {
            await addManagedCompanyProductionLog(logData);
            await logActivity('company', `ثبت تولید جدید: ${logData.totalProduced} واحد`, undefined, 'company', selectedCompanyId);
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

    if (selectedCompanyId && selectedCompany) {
        const expenses = companyEntries.filter(e => e.type === 'expense').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const waterRevenue = companyEntries.filter(e => e.type === 'water_revenue').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const equipmentRevenue = companyEntries.filter(e => e.type === 'equipment_revenue').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalWater = waterRevenue.reduce((sum, e) => sum + e.amount, 0);
        const totalEquipment = equipmentRevenue.reduce((sum, e) => sum + e.amount, 0);

        return (
            <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
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
                                {selectedCompany.name}
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
                                {selectedCompany.type === CompanyType.WATER ? (
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
                                        {formatCurrency(selectedCompany.establishmentCost || 0, storeSettings, 'AFN')}
                                    </span>
                                </div>
                                <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center min-w-[120px]">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">مجموع طلبات</span>
                                    <span className="text-lg font-black text-red-600">
                                        {formatCurrency(
                                            selectedCompany.type === CompanyType.WATER 
                                                ? (companyStats.find(s => s.id === selectedCompanyId)?.totalDebt || 0)
                                                : managedCompanyInvoices.filter(inv => inv.companyId === selectedCompanyId && inv.status === 'unpaid').reduce((sum, inv) => sum + inv.totalAmount, 0),
                                            storeSettings, 'AFN'
                                        )}
                                    </span>
                                </div>
                                <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center min-w-[120px]">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">سود/ضرر نهایی</span>
                                    <span className={`text-lg font-black ${(totalWater + totalEquipment + (selectedCompany.type !== CompanyType.WATER ? managedCompanyInvoices.filter(inv => inv.companyId === selectedCompanyId && inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0) : 0) - totalExpenses) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCurrency(
                                            totalWater + totalEquipment + (selectedCompany.type !== CompanyType.WATER ? managedCompanyInvoices.filter(inv => inv.companyId === selectedCompanyId && inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0) : 0) - totalExpenses, 
                                            storeSettings, 'AFN'
                                        )}
                                    </span>
                                </div>
                                <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center min-w-[120px]">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">وضعیت بازگشت سرمایه</span>
                                    <span className={`text-lg font-black ${(totalWater + totalEquipment + (selectedCompany.type !== CompanyType.WATER ? managedCompanyInvoices.filter(inv => inv.companyId === selectedCompanyId && inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0) : 0) - totalExpenses - (selectedCompany.establishmentCost || 0)) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                        {formatCurrency(
                                            totalWater + totalEquipment + (selectedCompany.type !== CompanyType.WATER ? managedCompanyInvoices.filter(inv => inv.companyId === selectedCompanyId && inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0) : 0) - totalExpenses - (selectedCompany.establishmentCost || 0), 
                                            storeSettings, 'AFN'
                                        )}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {companyDetailTab === 'ledger' ? (
                    <div className={`grid grid-cols-1 ${selectedCompany.type === CompanyType.WATER ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
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

                        {selectedCompany.type === CompanyType.WATER ? (
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
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">شماره میتر:</span>
                                                <span className="font-bold text-slate-700">{customer.meterNumber}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">آدرس:</span>
                                                <span className="text-slate-700">{customer.address}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">آخرین قراءت:</span>
                                                <span className="font-bold text-blue-600">{lastRecord ? lastRecord.currentReading : customer.initialReading}</span>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100 flex gap-2">
                                            {hasPermission('company_billing:create') && (
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
                                            )}
                                            <button 
                                                onClick={() => { 
                                                    setSelectedCustomerForHistory(customer); 
                                                    setIsHistoryModalOpen(true); 
                                                }}
                                                className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"
                                                title="تاریخچه بل‌ها"
                                            >
                                                <HistoryIcon className="w-5 h-5" />
                                            </button>
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
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
                                فروشات و فاکتورها
                            </h2>
                            <div className="flex gap-2 w-full md:w-auto">
                                <div className="relative flex-grow md:w-64">
                                    <input 
                                        type="text" 
                                        placeholder="جستجوی فاکتور (نام مشتری، شماره)..." 
                                        value={invoiceSearchQuery}
                                        onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                                    />
                                    <EyeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                                <button 
                                    onClick={() => { setEditingInvoice(null); setInvoiceDate(new Date().toISOString().split('T')[0]); setIsInvoiceModalOpen(true); }}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    ثبت فاکتور جدید
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="p-4 text-xs font-bold text-slate-500">مشتری</th>
                                            <th className="p-4 text-xs font-bold text-slate-500">تاریخ</th>
                                            <th className="p-4 text-xs font-bold text-slate-500">تعداد/مقدار</th>
                                            <th className="p-4 text-xs font-bold text-slate-500">مبلغ کل</th>
                                            <th className="p-4 text-xs font-bold text-slate-500">وضعیت</th>
                                            <th className="p-4 text-xs font-bold text-slate-500">عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {managedCompanyInvoices
                                            .filter(inv => inv.companyId === selectedCompanyId)
                                            .filter(inv => {
                                                const customer = managedCompanyCustomers.find(c => c.id === inv.customerId);
                                                return customer?.name.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) || inv.id.includes(invoiceSearchQuery);
                                            })
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map(invoice => {
                                                const customer = managedCompanyCustomers.find(c => c.id === invoice.customerId);
                                                return (
                                                    <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4">
                                                            <div className="font-bold text-slate-800 text-sm">{customer?.name || 'مشتری گذری'}</div>
                                                        </td>
                                                        <td className="p-4 text-xs text-slate-600">{formatJalaliDate(invoice.date)}</td>
                                                        <td className="p-4 text-xs font-bold text-blue-600">{invoice.quantity}</td>
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
                                                                    onClick={() => { setEditingInvoice(invoice); setInvoiceDate(invoice.date); setIsInvoiceModalOpen(true); }}
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
                            {managedCompanyInvoices.filter(inv => inv.companyId === selectedCompanyId).length === 0 && (
                                <div className="p-12 text-center text-slate-400 italic">هیچ فاکتوری ثبت نشده است.</div>
                            )}
                        </div>
                    </div>
                ) : companyDetailTab === 'production' ? (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <ChartBarIcon className="w-6 h-6 text-blue-600" />
                                تولیدات روزانه
                            </h2>
                            <div className="flex gap-2 w-full md:w-auto">
                                <div className="relative flex-grow md:w-64">
                                    <input 
                                        type="text" 
                                        placeholder="جستجوی تولید (تاریخ)..." 
                                        value={productionSearchQuery}
                                        onChange={(e) => setProductionSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                                    />
                                    <EyeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                                <button 
                                    onClick={() => { setEditingProductionLog(null); setProductionDate(new Date().toISOString().split('T')[0]); setIsProductionModalOpen(true); }}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    ثبت تولید جدید
                                </button>
                            </div>
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
                                        {managedCompanyProductionLogs
                                            .filter(log => log.companyId === selectedCompanyId)
                                            .filter(log => log.date.includes(productionSearchQuery))
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map(log => (
                                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 text-xs text-slate-600">{formatJalaliDate(log.date)}</td>
                                                    <td className="p-4 text-sm font-bold text-blue-600">{log.totalProduced}</td>
                                                    <td className="p-4 text-sm font-bold text-red-600">{log.wasteCount}</td>
                                                    <td className="p-4 text-sm font-black text-slate-900">{log.totalProduced - log.wasteCount}</td>
                                                    <td className="p-4 text-xs text-slate-500">{log.notes || '---'}</td>
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
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <CurrencyDollarIcon className="w-6 h-6 text-emerald-600" />
                                وصولی‌ها و بدهکاران
                            </h2>
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
                                <div className="flex gap-2">
                                    <div className="bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 hidden sm:block">
                                        <span className="text-[10px] text-red-600 block">طلبات:</span>
                                        <span className="text-sm font-black text-red-700">{formatCurrency(currentCompanyBillingRecords.filter(r => r.status === 'unpaid').reduce((sum, r) => sum + r.amount, 0), storeSettings, 'AFN')}</span>
                                    </div>
                                    <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 hidden sm:block">
                                        <span className="text-[10px] text-emerald-600 block">وصولی:</span>
                                        <span className="text-sm font-black text-emerald-700">{formatCurrency(currentCompanyBillingRecords.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0), storeSettings, 'AFN')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

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
                                        {currentCompanyBillingRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => {
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
                            {currentCompanyBillingRecords.length === 0 && (
                                <div className="p-12 text-center text-slate-400 italic">هیچ سابقه میترخوانی ثبت نشده است.</div>
                            )}
                        </div>
                    </div>
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
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">شماره میتر</label>
                                    <input name="meterNumber" required defaultValue={editingCustomer?.meterNumber} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">شماره تماس</label>
                                    <input name="phone" required defaultValue={editingCustomer?.phone} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">قراءت اولیه میتر</label>
                                <input name="initialReading" type="number" required defaultValue={editingCustomer?.initialReading} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <button type="submit" className="w-full p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg">
                                {editingCustomer ? 'بروزرسانی اطلاعات' : 'ثبت مشتری'}
                            </button>
                        </form>
                    </Modal>
                )}

                {isBillingModalOpen && selectedCustomerForBilling && (
                    <Modal 
                        title={`ثبت میترخوانی - ${selectedCustomerForBilling.name}`} 
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
                                                <span className="font-bold text-blue-800">{formatCurrency(selectedCompany.unitPrice || 0, storeSettings, 'AFN')}</span>
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

                {isHistoryModalOpen && selectedCustomerForHistory && (
                    <Modal 
                        title={`تاریخچه بل‌های ${selectedCustomerForHistory.name}`} 
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
                                {customerBillingRecords
                                    .filter(r => r.customerId === selectedCustomerForHistory.id)
                                    .filter(r => 
                                        r.date.includes(historySearchQuery) || 
                                        r.amount.toString().includes(historySearchQuery)
                                    )
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map(record => (
                                        <div key={record.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-100 transition-all shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">تاریخ ثبت: {formatJalaliDate(record.date)}</div>
                                                    <div className="text-sm font-black text-slate-800">{formatCurrency(record.amount, storeSettings, 'AFN')}</div>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {record.status === 'paid' ? 'پرداخت شده' : 'بدهکار'}
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
                                                <div className="bg-slate-50 p-2 rounded-lg">
                                                    <span className="text-slate-400 block mb-1">میتر قبلی</span>
                                                    <span className="font-bold text-slate-700">{record.previousReading}</span>
                                                </div>
                                                <div className="bg-slate-50 p-2 rounded-lg">
                                                    <span className="text-slate-400 block mb-1">میتر فعلی</span>
                                                    <span className="font-bold text-slate-700">{record.currentReading}</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                {record.status === 'unpaid' && hasPermission('company_billing:settle') && (
                                                    <button 
                                                        onClick={() => handleMarkAsPaid(record)}
                                                        className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-700 transition-all shadow-sm"
                                                    >
                                                        وصول شد
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handlePrintInvoice(record)}
                                                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold hover:bg-blue-100 transition-all"
                                                >
                                                    چاپ مجدد
                                                </button>
                                                {hasPermission('company_billing:edit') && (
                                                    <button 
                                                        onClick={() => {
                                                            setEditingBillingRecord(record);
                                                            setSelectedCustomerForBilling(selectedCustomerForHistory);
                                                            setBillingDate(record.date);
                                                            setIsBillingModalOpen(true);
                                                        }}
                                                        className="px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-200 transition-all"
                                                    >
                                                        ویرایش
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                {customerBillingRecords.filter(r => r.customerId === selectedCustomerForHistory.id).length === 0 && (
                                    <div className="text-center py-8 text-slate-400 text-sm">هیچ تاریخچه‌ای یافت نشد.</div>
                                )}
                            </div>
                        </div>
                    </Modal>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
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

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
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
                                <div>
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
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">بازه زمانی</label>
                                    <select 
                                        value={activityDateFilter}
                                        onChange={(e) => setActivityDateFilter(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">همه زمان‌ها</option>
                                        <option value="today">امروز</option>
                                        <option value="yesterday">دیروز</option>
                                        <option value="custom">تاریخ خاص</option>
                                    </select>
                                </div>
                                {activityDateFilter === 'custom' && (
                                    <div>
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
                        title={`تاریخچه بل‌های ${selectedCustomerForHistory.name}`} 
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
                                {customerBillingRecords
                                    .filter(r => r.customerId === selectedCustomerForHistory.id)
                                    .filter(r => 
                                        r.date.includes(historySearchQuery) || 
                                        r.amount.toString().includes(historySearchQuery)
                                    )
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map(record => (
                                        <div key={record.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-100 transition-all shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">تاریخ ثبت: {formatJalaliDate(record.date)}</div>
                                                    <div className="text-sm font-black text-slate-800">{formatCurrency(record.amount, storeSettings, 'AFN')}</div>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {record.status === 'paid' ? 'پرداخت شده' : 'بدهکار'}
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
                                                <div className="bg-slate-50 p-2 rounded-lg">
                                                    <span className="text-slate-400 block mb-1">میتر قبلی</span>
                                                    <span className="font-bold text-slate-700">{record.previousReading}</span>
                                                </div>
                                                <div className="bg-slate-50 p-2 rounded-lg">
                                                    <span className="text-slate-400 block mb-1">میتر فعلی</span>
                                                    <span className="font-bold text-slate-700">{record.currentReading}</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                {record.status === 'unpaid' && hasPermission('company_billing:settle') && (
                                                    <button 
                                                        onClick={() => handleMarkAsPaid(record)}
                                                        className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-700 transition-all shadow-sm"
                                                    >
                                                        وصول شد
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handlePrintInvoice(record)}
                                                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold hover:bg-blue-100 transition-all"
                                                >
                                                    چاپ مجدد
                                                </button>
                                                {hasPermission('company_billing:edit') && (
                                                    <button 
                                                        onClick={() => {
                                                            setEditingBillingRecord(record);
                                                            setSelectedCustomerForBilling(selectedCustomerForHistory);
                                                            setBillingDate(record.date);
                                                            setIsBillingModalOpen(true);
                                                        }}
                                                        className="px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-200 transition-all"
                                                    >
                                                        ویرایش
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                {customerBillingRecords.filter(r => r.customerId === selectedCustomerForHistory.id).length === 0 && (
                                    <div className="text-center py-8 text-slate-400 text-sm">هیچ تاریخچه‌ای یافت نشد.</div>
                                )}
                            </div>
                        </div>
                    </Modal>
                )}
        </div>
    );
};

export default CompanyManagement;
