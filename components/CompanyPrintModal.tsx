
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
                    {/* Printable Area */}
                    <div className="printable-area bg-white mx-auto p-8 rounded-sm min-h-[29.7cm] w-full max-w-[21cm] text-slate-900 print:p-2 print:m-0 print:w-full print:max-w-none print:min-h-0 font-sans" dir="rtl">
                        {/* Header Section */}
                        <div className="text-center mb-6 print:mb-4">
                            <h1 className="text-2xl font-black text-slate-900 print:text-xl mb-1 tracking-tight">{company.name}</h1>
                            <p className="text-[10px] font-bold text-slate-500 print:text-[8px] mb-2 uppercase tracking-widest">
                                {isBillingRecord ? 'مدیریت آبرسانی و خدمات فنی' : 'تولید و توزیع محصولات'}
                            </p>
                            <div className="border-y border-slate-900 py-1">
                                <h2 className="text-sm font-black text-slate-900 print:text-xs tracking-widest">{headerTitle}</h2>
                            </div>
                        </div>

                        {/* Metadata Section */}
                        <div className="flex justify-between text-[10px] font-bold text-slate-700 mb-4 print:mb-3 border-b border-slate-100 pb-2">
                            <div className="space-y-1">
                                <p className="flex items-center gap-1">
                                    <span>تاریخ:</span>
                                    <span className="font-mono text-slate-900">{new Date(record.date).toLocaleDateString('fa-IR')}</span>
                                </p>
                                <p className="flex items-center gap-1">
                                    <span>ساعت:</span>
                                    <span className="font-mono text-slate-900">{new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </p>
                            </div>
                            <div className="text-left space-y-1">
                                <p className="flex items-center justify-end gap-1">
                                    <span>شماره:</span>
                                    <span className="font-mono text-slate-900">{record.id.slice(-6).toUpperCase()}</span>
                                </p>
                            </div>
                        </div>

                        {/* Customer Info Section */}
                        <div className="mb-6 print:mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase">مشتری:</span>
                                <span className="text-sm font-black text-slate-900">{customer.name} {customer.fatherName ? `فرزند ${customer.fatherName}` : ''}</span>
                            </div>
                            {isBillingRecord && (
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">شماره میتر:</span>
                                    <span className="text-xs font-mono font-black text-slate-900">{customer.meterNumber || '---'}</span>
                                </div>
                            )}
                        </div>

                        {/* Items Section (Textual Format) */}
                        <div className="mb-6 print:mb-4 space-y-3 border-t border-b border-slate-900 py-3">
                            <div className="flex flex-col gap-1">
                                <div className="text-sm font-black text-slate-900">
                                    {isBillingRecord ? 'مصرف آب دوره' : (record as ManagedCompanyInvoice).description || 'فروش محصول'}
                                </div>
                                {isBillingRecord && (
                                    <div className="text-[9px] text-slate-500 font-mono">
                                        قراءت: {(record as CustomerBillingRecord).previousReading} الی {(record as CustomerBillingRecord).currentReading}
                                    </div>
                                )}
                                <div className="flex justify-between items-center mt-1">
                                    <div className="text-xs font-mono font-bold text-slate-700" dir="ltr">
                                        {isBillingRecord ? (record as CustomerBillingRecord).consumption : (record as ManagedCompanyInvoice).units} 
                                        {' '} × {' '}
                                        {(isBillingRecord ? company.unitPrice || 0 : (record as ManagedCompanyInvoice).pricePerUnit).toLocaleString('fa-IR')}
                                    </div>
                                    <div className="text-sm font-mono font-black text-slate-900" dir="ltr">
                                        {totalAmount.toLocaleString('fa-IR')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Totals Section */}
                        <div className="mb-8 print:mb-6">
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase">{totalLabel}</span>
                                <span className="text-3xl font-black text-slate-900 font-mono leading-none" dir="ltr">
                                    {totalAmount.toLocaleString('fa-IR')}
                                </span>
                            </div>
                            <div className="mt-4 text-[10px] font-bold text-slate-700 border-t border-slate-100 pt-2">
                                مبلغ به حروف: <span className="text-slate-900 font-black">{numberToPersianWords(totalAmount)} افغانی</span>
                            </div>
                            {record.status === 'paid' && (
                                <div className="mt-4 text-center">
                                    <span className="text-lg font-black text-slate-900 border-2 border-slate-900 px-4 py-0.5 rounded inline-block rotate-[-2deg]">وصول شد</span>
                                </div>
                            )}
                        </div>

                        {/* Signatures Section */}
                        <div className="grid grid-cols-2 gap-4 text-center mb-10 print:mb-6">
                            <div className="space-y-4">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{registrarLabel}</p>
                                <p className="text-[11px] font-black text-slate-900">{registrarValue || '---'}</p>
                            </div>
                            <div className="space-y-4">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">مهر و امضاء</p>
                                <div className="h-8"></div>
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="text-center pt-6 border-t border-dashed border-slate-300 print:pt-4">
                            <p className="text-[10px] font-bold text-slate-600 print:text-[8px] mb-1">{company.address || storeSettings.address}</p>
                            <div className="flex justify-center items-center gap-4 text-[10px] font-black text-slate-900 print:text-[9px]">
                                <p>تلفن پشتیبانی: <span className="font-mono">{company.phone || storeSettings.phone}</span></p>
                                {company.managerName && <p>مسئول: <span>{company.managerName}</span></p>}
                            </div>
                            
                            <div className="mt-6 print:mt-4">
                                <p className="text-xs font-black text-slate-900 print:text-[10px] italic">"با تشکر از انتخاب و اعتماد شما؛ رضایت شما سرمایه ماست."</p>
                            </div>

                            <div className="mt-4 print:mt-2 opacity-20 grayscale">
                                <p className="text-[8px] font-mono tracking-widest">POWERED BY VENDURA SMART BUSINESS SYSTEMS</p>
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
