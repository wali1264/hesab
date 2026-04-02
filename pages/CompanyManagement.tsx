
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import type { ManagedCompany, CompanyLedgerEntry, LedgerEntryType, OwnerTransaction, OwnerTransactionType } from '../types';
import { PlusIcon, XIcon, EyeIcon, TrashIcon, UserGroupIcon, EditIcon, BuildingIcon, ArrowLeftIcon, WalletIcon, TrendingUpIcon, TrendingDownIcon, ChartBarIcon } from '../components/icons';
import { formatCurrency, numberToPersianWords } from '../utils/formatters';
import JalaliDateInput from '../components/JalaliDateInput';

const Modal: React.FC<{ title: string, onClose: () => void, children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-[100] p-4 pt-12 md:pt-20 overflow-y-auto modal-animate">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden my-0">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors"><XIcon className="w-6 h-6" /></button>
            </div>
            <div className="p-6 bg-white">{children}</div>
        </div>
    </div>
);

const CompanyManagement: React.FC = () => {
    const { 
        managedCompanies, managedCompanyLedger, ownerTransactions, ownerExpenseCategories,
        addManagedCompany, updateManagedCompany, deleteManagedCompany, 
        addLedgerEntry, updateLedgerEntry, deleteLedgerEntry,
        addOwnerTransaction, updateOwnerTransaction, deleteOwnerTransaction,
        addOwnerExpenseCategory, updateOwnerExpenseCategory, deleteOwnerExpenseCategory,
        showToast, storeSettings 
    } = useAppContext();
    
    const [activeTab, setActiveTab] = useState<'companies' | 'dashboard'>('companies');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<ManagedCompany | null>(null);
    const [isAddLedgerModalOpen, setIsAddLedgerModalOpen] = useState(false);
    const [editingLedgerEntry, setEditingLedgerEntry] = useState<CompanyLedgerEntry | null>(null);
    const [ledgerEntryType, setLedgerEntryType] = useState<LedgerEntryType>('expense');
    const [ledgerDate, setLedgerDate] = useState(new Date().toISOString().split('T')[0]);

    // Owner Dashboard States
    const [isOwnerTxModalOpen, setIsOwnerTxModalOpen] = useState(false);
    const [editingOwnerTx, setEditingOwnerTx] = useState<OwnerTransaction | null>(null);
    const [ownerTxType, setOwnerTxType] = useState<OwnerTransactionType>('personal_expense');
    const [ownerTxDate, setOwnerTxDate] = useState(new Date().toISOString().split('T')[0]);

    // Category Management States
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<{ id: string, name: string } | null>(null);
    const [amountInWords, setAmountInWords] = useState('');

    const selectedCompany = useMemo(() => managedCompanies.find(c => c.id === selectedCompanyId), [managedCompanies, selectedCompanyId]);
    const companyEntries = useMemo(() => managedCompanyLedger.filter(e => e.companyId === selectedCompanyId), [managedCompanyLedger, selectedCompanyId]);

    const companyStats = useMemo(() => {
        return managedCompanies.map(company => {
            const entries = managedCompanyLedger.filter(e => e.companyId === company.id);
            const expenses = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
            const waterRevenue = entries.filter(e => e.type === 'water_revenue').reduce((sum, e) => sum + e.amount, 0);
            const equipmentRevenue = entries.filter(e => e.type === 'equipment_revenue').reduce((sum, e) => sum + e.amount, 0);
            const totalIncome = waterRevenue + equipmentRevenue;
            const profit = totalIncome - expenses;
            const investmentRecovery = totalIncome - (expenses + (company.establishmentCost || 0));
            return {
                ...company,
                expenses,
                totalIncome,
                profit,
                investmentRecovery
            };
        });
    }, [managedCompanies, managedCompanyLedger]);

    const handleAddCompany = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const companyData = {
            name: formData.get('name') as string,
            managerName: formData.get('managerName') as string,
            phone: formData.get('phone') as string,
            establishmentCost: Number(formData.get('establishmentCost')) || 0,
        };

        if (editingCompany) {
            await updateManagedCompany({ ...editingCompany, ...companyData });
        } else {
            await addManagedCompany(companyData);
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
        } else {
            await addLedgerEntry(entryData);
        }
        setIsAddLedgerModalOpen(false);
        setEditingLedgerEntry(null);
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

    const totalCompanyProfit = useMemo(() => {
        return companyStats.reduce((sum, c) => sum + c.profit, 0);
    }, [companyStats]);

    const ownerStats = useMemo(() => {
        const expenses = ownerTransactions.filter(t => t.type === 'personal_expense').reduce((sum, t) => sum + t.amount, 0);
        const receivables = ownerTransactions.filter(t => t.type === 'receivable').reduce((sum, t) => sum + t.amount, 0);
        const payables = ownerTransactions.filter(t => t.type === 'payable').reduce((sum, t) => sum + t.amount, 0);
        const netWorth = totalCompanyProfit - expenses + receivables - payables;
        return { expenses, receivables, payables, netWorth };
    }, [ownerTransactions, totalCompanyProfit]);

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
                            <p className="text-slate-500 text-sm">مدیریت تراکنش‌های مالی شرکت</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center min-w-[120px]">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">هزینه تاسیس</span>
                            <span className="text-lg font-black text-orange-600">
                                {formatCurrency(selectedCompany.establishmentCost || 0, useAppContext().storeSettings, 'AFN')}
                            </span>
                        </div>
                        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center min-w-[120px]">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">سود/ضرر نهایی</span>
                            <span className={`text-lg font-black ${(totalWater + totalEquipment - totalExpenses) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrency(totalWater + totalEquipment - totalExpenses, useAppContext().storeSettings, 'AFN')}
                            </span>
                        </div>
                        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center min-w-[120px]">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">وضعیت بازگشت سرمایه</span>
                            <span className={`text-lg font-black ${(totalWater + totalEquipment - totalExpenses - (selectedCompany.establishmentCost || 0)) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                {formatCurrency(totalWater + totalEquipment - totalExpenses - (selectedCompany.establishmentCost || 0), useAppContext().storeSettings, 'AFN')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Expenses Column */}
                    <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-gray-200/60 shadow-xl overflow-hidden flex flex-col h-[70vh]">
                        <div className="p-4 bg-red-50 border-b border-red-100 flex justify-between items-center">
                            <h3 className="font-bold text-red-700 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                هزینه‌ها
                            </h3>
                            <button 
                                onClick={() => { setLedgerEntryType('expense'); setEditingLedgerEntry(null); setAmountInWords(''); setIsAddLedgerModalOpen(true); }}
                                className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-2 space-y-2">
                            {expenses.map(entry => (
                                <div key={entry.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-slate-800">{formatCurrency(entry.amount, useAppContext().storeSettings, 'AFN')}</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingLedgerEntry(entry); setLedgerEntryType('expense'); setLedgerDate(entry.date); setAmountInWords(numberToPersianWords(entry.amount)); setIsAddLedgerModalOpen(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"><EditIcon className="w-4 h-4" /></button>
                                            <button onClick={() => deleteLedgerEntry(entry.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{entry.description}</p>
                                    <div className="text-[10px] text-slate-400 mt-2 flex justify-end">{entry.date}</div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500">مجموع هزینه‌ها:</span>
                                <span className="font-black text-red-600">{formatCurrency(totalExpenses, useAppContext().storeSettings, 'AFN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Water Revenue Column */}
                    <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-gray-200/60 shadow-xl overflow-hidden flex flex-col h-[70vh]">
                        <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                            <h3 className="font-bold text-blue-700 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                عواید فروش آب
                            </h3>
                            <button 
                                onClick={() => { setLedgerEntryType('water_revenue'); setEditingLedgerEntry(null); setAmountInWords(''); setIsAddLedgerModalOpen(true); }}
                                className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-2 space-y-2">
                            {waterRevenue.map(entry => (
                                <div key={entry.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-slate-800">{formatCurrency(entry.amount, useAppContext().storeSettings, 'AFN')}</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingLedgerEntry(entry); setLedgerEntryType('water_revenue'); setLedgerDate(entry.date); setAmountInWords(numberToPersianWords(entry.amount)); setIsAddLedgerModalOpen(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"><EditIcon className="w-4 h-4" /></button>
                                            <button onClick={() => deleteLedgerEntry(entry.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{entry.description}</p>
                                    <div className="text-[10px] text-slate-400 mt-2 flex justify-end">{entry.date}</div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500">مجموع عواید آب:</span>
                                <span className="font-black text-blue-600">{formatCurrency(totalWater, useAppContext().storeSettings, 'AFN')}</span>
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
                            <button 
                                onClick={() => { setLedgerEntryType('equipment_revenue'); setEditingLedgerEntry(null); setAmountInWords(''); setIsAddLedgerModalOpen(true); }}
                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-2 space-y-2">
                            {equipmentRevenue.map(entry => (
                                <div key={entry.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-slate-800">{formatCurrency(entry.amount, useAppContext().storeSettings, 'AFN')}</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingLedgerEntry(entry); setLedgerEntryType('equipment_revenue'); setLedgerDate(entry.date); setAmountInWords(numberToPersianWords(entry.amount)); setIsAddLedgerModalOpen(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"><EditIcon className="w-4 h-4" /></button>
                                            <button onClick={() => deleteLedgerEntry(entry.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{entry.description}</p>
                                    <div className="text-[10px] text-slate-400 mt-2 flex justify-end">{entry.date}</div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500">مجموع عواید تجهیزات:</span>
                                <span className="font-black text-emerald-600">{formatCurrency(totalEquipment, useAppContext().storeSettings, 'AFN')}</span>
                            </div>
                        </div>
                    </div>
                </div>

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
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        سود و زیان کل شرکت‌ها
                    </button>
                </div>
            </div>

            {activeTab === 'companies' ? (
                <>
                    <div className="flex justify-end">
                        <button 
                            onClick={() => { setEditingCompany(null); setAmountInWords(''); setIsAddCompanyModalOpen(true); }}
                            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 group"
                        >
                            <PlusIcon className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                            افزودن شرکت جدید
                        </button>
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
                                            <button onClick={() => { setEditingCompany(company); setAmountInWords(numberToPersianWords(company.establishmentCost || 0)); setIsAddCompanyModalOpen(true); }} className="p-2 bg-white rounded-xl border border-slate-100 text-blue-600 hover:bg-blue-50 transition-all shadow-sm"><EditIcon className="w-5 h-5" /></button>
                                            <button onClick={() => deleteManagedCompany(company.id)} className="p-2 bg-white rounded-xl border border-slate-100 text-red-600 hover:bg-red-50 transition-all shadow-sm"><TrashIcon className="w-5 h-5" /></button>
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

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">هزینه تاسیس</span>
                                            <span className="text-sm font-bold text-orange-600">{formatCurrency(company.establishmentCost || 0, storeSettings, 'AFN')}</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">مجموع هزینه‌ها</span>
                                            <span className="text-sm font-bold text-red-600">{formatCurrency(company.expenses, storeSettings, 'AFN')}</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 col-span-2">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">مجموع عواید</span>
                                            <span className="text-sm font-bold text-blue-600 text-center block">{formatCurrency(company.totalIncome, storeSettings, 'AFN')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`p-4 flex items-center justify-between ${company.profit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] opacity-70 uppercase font-bold">سود/ضرر خالص</span>
                                        <span className="text-lg font-black">{formatCurrency(company.profit, storeSettings, 'AFN')}</span>
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
            ) : (
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
                                <p className="text-slate-400 mt-2 text-sm">محاسبه شده بر اساس سود شرکت‌ها، طلبات، بدهی‌ها و مصارف شخصی</p>
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
                                            <span className="text-[10px] text-slate-400">{tx.date}</span>
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
                                            <span className="text-[10px] text-slate-400">{tx.date}</span>
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
                                            <span className="text-[10px] text-slate-400">{tx.date}</span>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">نام شرکت آبرسانی</label>
                            <input 
                                name="name" 
                                required 
                                defaultValue={editingCompany?.name}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                placeholder="مثلاً: شرکت آبرسانی پامیر"
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
                            {amountInWords && <p className="text-xs text-blue-600 mt-1 font-bold">{amountInWords} افغانی</p>}
                        </div>
                        <button type="submit" className="w-full p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                            {editingCompany ? 'بروزرسانی اطلاعات' : 'ثبت شرکت'}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default CompanyManagement;
