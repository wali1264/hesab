
import React from 'react';
import { XIcon, PrintIcon } from './icons';
import { useAppContext } from '../AppContext';
import { formatCurrency, numberToPersianWords } from '../utils/formatters';
import { formatJalaliDate } from '../utils/jalali';
import type { ManagedCompany, ManagedCompanyCustomer, CustomerBillingRecord, ManagedCompanyInvoice } from '../types';
import { CompanyType } from '../types';

interface CompanyPrintModalProps {
    record: ManagedCompanyInvoice | CustomerBillingRecord;
    company: ManagedCompany;
    customer: ManagedCompanyCustomer;
    onClose: () => void;
}

const CompanyPrintModal: React.FC<CompanyPrintModalProps> = ({ record, company, customer, onClose }) => {
    const { storeSettings } = useAppContext();
    
    const isBillingRecord = 'consumption' in record;
    const totalAmount = isBillingRecord ? (record as CustomerBillingRecord).amount : (record as ManagedCompanyInvoice).totalAmount;
    const headerTitle = isBillingRecord ? 'قبض مصرف آب' : 'فاکتور فروش محصولات';
    const totalLabel = isBillingRecord ? 'مجموع قابل پرداخت:' : 'مجموع فاکتور:';
    const registrarLabel = isBillingRecord ? 'نام میترخوان' : 'نام ثبت‌کننده';
    const registrarValue = isBillingRecord ? (record as CustomerBillingRecord).surveyorName : (record as ManagedCompanyInvoice).registrarName;
    const collectorValue = record.collectorName || '---';

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 modal-animate print:bg-white print:p-0">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none print:w-full print:max-w-none">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 no-print">
                    <div className="flex items-center gap-2">
                        <PrintIcon className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-bold text-slate-800">پیش‌نمایش چاپ</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50 print:p-0 print:bg-white print:overflow-visible">
                        {/* Global Standard Frame - Flexible Height for Printing */}
                        <div className="printable-area bg-white mx-auto p-[2mm] rounded-sm w-full max-w-[21cm] text-slate-900 print:p-[2mm] print:m-0 print:w-full print:max-w-none print:min-h-0 font-sans text-center" dir="rtl" style={{ minHeight: '100%' }}>
                            
                            {/* Company Header - Reduced Size & Centered */}
                            <div className="mb-1">
                                <h1 className="text-2xl font-black tracking-tight mb-0">{company.name}</h1>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    {isBillingRecord ? 'مدیریت آبرسانی و خدمات فنی' : 'تولید و توزیع محصولات'}
                                </p>
                            </div>

                            {/* Title & Metadata - Centered */}
                            <div className="mb-1 space-y-0">
                                <h2 className="text-lg font-black border-y border-slate-900 py-1 inline-block px-8">{headerTitle}</h2>
                                <div className="text-[10px] font-bold space-y-0 mt-1">
                                    <p>تاریخ: <span className="font-mono text-xs">{new Date(record.date).toLocaleDateString('fa-IR')}</span></p>
                                    <p>ساعت: <span className="font-mono text-xs">{new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span></p>
                                    <p>شماره فاکتور: <span className="font-mono text-xs">{record.id.slice(-6).toUpperCase()}</span></p>
                                </div>
                            </div>

                            {/* Customer Info - Reduced Size & Centered */}
                            <div className="mb-1">
                                <p className="text-[8px] font-black text-slate-400 mb-0 uppercase tracking-widest">نام مشتری / مشترک</p>
                                <h3 className="text-xl font-black">{customer.name} {customer.fatherName ? `فرزند ${customer.fatherName}` : ''}</h3>
                                {isBillingRecord && (
                                    <p className="text-sm font-mono font-black mt-0">کد اشتراک: {customer.meterNumber || '---'}</p>
                                )}
                            </div>

                            {/* Items Section - Centered */}
                            <div className="mb-2 space-y-1">
                                <div className="space-y-0">
                                    <div className="text-lg font-black">
                                        {isBillingRecord ? 'مصرف آب دوره' : (record as ManagedCompanyInvoice).description || 'فروش محصول'}
                                    </div>
                                    {isBillingRecord && (
                                        <div className="text-xs text-slate-500 font-mono">
                                            قراءت: {(record as CustomerBillingRecord).previousReading} الی {(record as CustomerBillingRecord).currentReading}
                                        </div>
                                    )}
                                    <div className="text-base font-mono font-black text-slate-700">
                                        {isBillingRecord ? (record as CustomerBillingRecord).consumption : (record as ManagedCompanyInvoice).units} 
                                        {' '} × {' '}
                                        {(isBillingRecord ? company.unitPrice || 0 : (record as ManagedCompanyInvoice).pricePerUnit).toLocaleString('fa-IR')}
                                    </div>
                                </div>
                            </div>

                            {/* Total Amount - Optimized Size & Centered */}
                            <div className="mb-2">
                                <p className="text-xs font-black text-slate-500 mb-0 uppercase tracking-widest">مبلغ قابل پرداخت</p>
                                <div className="text-4xl font-black font-mono mb-0 leading-none" dir="ltr">
                                    {totalAmount.toLocaleString('fa-IR')}
                                </div>
                                <div className="text-sm font-black text-slate-800">
                                    {numberToPersianWords(totalAmount)} افغانی
                                </div>
                            </div>

                            {/* Status - Centered */}
                            {record.status === 'paid' && (
                                <div className="mb-2">
                                    <span className="text-2xl font-black border-2 border-slate-900 px-8 py-1 rounded-xl inline-block rotate-[-2deg]">وصول شد</span>
                                </div>
                            )}

                            {/* Users Info - Centered */}
                            <div className="mb-2 space-y-1 border-t border-slate-900 pt-2">
                                <div className="flex justify-center gap-8">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0">ثبت‌کننده</p>
                                        <p className="text-xs font-black">{registrarValue || '---'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0">وصول‌کننده</p>
                                        <p className="text-xs font-black">{collectorValue}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer - Centered */}
                            <div className="pt-2 border-t border-dashed border-slate-300">
                                <p className="text-xs font-black mb-1 italic">"با تشکر از انتخاب و اعتماد شما؛ رضایت شما سرمایه ماست."</p>
                                <div className="flex justify-center items-center gap-6 text-[10px] font-black text-slate-600">
                                    <p>پشتیبانی: <span className="font-mono">{company.phone || storeSettings.phone}</span></p>
                                    {company.managerName && <p>مدیریت: <span>{company.managerName}</span></p>}
                                </div>
                            </div>
                        </div>
                    </div>

                <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3 no-print">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                    >
                        بستن
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <PrintIcon className="w-5 h-5" />
                        <span>چاپ نهایی</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompanyPrintModal;
