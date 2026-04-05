
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
                    <div className="printable-area bg-white shadow-lg mx-auto p-8 border border-slate-200 rounded-sm min-h-[29.7cm] w-full max-w-[21cm] text-slate-900 print:shadow-none print:border-none print:p-2 print:m-0 print:w-full print:max-w-none print:min-h-0 font-sans" dir="rtl">
                        {/* Header Section */}
                        <div className="text-center border-b-2 border-slate-900 pb-4 mb-6 print:pb-2 print:mb-4">
                            <h1 className="text-2xl font-black text-slate-900 print:text-xl mb-1">{company.name}</h1>
                            <p className="text-sm font-bold text-slate-600 print:text-[10px] mb-2">
                                {isBillingRecord ? 'مدیریت آبرسانی و خدمات فنی' : 'تولید و توزیع محصولات'}
                            </p>
                            <div className="inline-block border-2 border-slate-900 px-6 py-1 rounded-full print:px-4 print:py-0.5">
                                <h2 className="text-lg font-black text-slate-900 print:text-sm uppercase tracking-wider">{headerTitle}</h2>
                            </div>
                        </div>

                        {/* Metadata Section */}
                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-6 print:mb-4 print:text-[10px] border-b border-dashed border-slate-300 pb-2">
                            <div className="space-y-1">
                                <p>تاریخ: <span className="font-mono">{formatJalaliDate(record.date)}</span></p>
                                <p>ساعت: <span className="font-mono">{new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span></p>
                            </div>
                            <div className="text-left">
                                <p>شماره فاکتور: <span className="font-mono">{record.id.slice(-8).toUpperCase()}</span></p>
                                <p>واحد پول: <span className="text-slate-900">افغانی (AFN)</span></p>
                            </div>
                        </div>

                        {/* Customer Info Section */}
                        <div className="space-y-2 mb-8 print:mb-6 print:space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xs font-black text-slate-500 whitespace-nowrap print:text-[9px]">نام مشترک:</span>
                                <div className="flex-grow border-b border-dotted border-slate-300"></div>
                                <span className="text-sm font-black text-slate-900 print:text-[11px]">{customer.name} {customer.fatherName ? `فرزند ${customer.fatherName}` : ''}</span>
                            </div>
                            {isBillingRecord && (
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-black text-slate-500 whitespace-nowrap print:text-[9px]">شماره میتر:</span>
                                    <div className="flex-grow border-b border-dotted border-slate-300"></div>
                                    <span className="text-sm font-mono font-black text-slate-900 print:text-[11px]">{customer.meterNumber || '---'}</span>
                                </div>
                            )}
                            <div className="flex items-baseline gap-2">
                                <span className="text-xs font-black text-slate-500 whitespace-nowrap print:text-[9px]">آدرس و تماس:</span>
                                <div className="flex-grow border-b border-dotted border-slate-300"></div>
                                <span className="text-sm font-bold text-slate-800 print:text-[10px]">{customer.address || '---'} | <span className="font-mono">{customer.phone || '---'}</span></span>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="mb-8 print:mb-6">
                            <div className="border-t-2 border-b-2 border-slate-900 py-2 mb-4 print:py-1 print:mb-2">
                                <div className="grid grid-cols-12 gap-2 text-xs font-black text-slate-900 print:text-[9px]">
                                    <div className="col-span-6">شرح کالا / خدمات</div>
                                    <div className="col-span-2 text-center">تعداد</div>
                                    <div className="col-span-2 text-center">فی</div>
                                    <div className="col-span-2 text-left">مجموع</div>
                                </div>
                            </div>

                            <div className="space-y-4 print:space-y-2">
                                <div className="grid grid-cols-12 gap-2 items-center text-sm print:text-[10px]">
                                    <div className="col-span-6 font-bold text-slate-900">
                                        {isBillingRecord ? 'مصرف آب دوره' : (record as ManagedCompanyInvoice).description || 'فروش محصول'}
                                        {isBillingRecord && (
                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5 print:text-[8px]">
                                                قراءت: {(record as CustomerBillingRecord).previousReading} → {(record as CustomerBillingRecord).currentReading}
                                            </p>
                                        )}
                                    </div>
                                    <div className="col-span-2 text-center font-mono font-bold">
                                        {isBillingRecord ? (record as CustomerBillingRecord).consumption : (record as ManagedCompanyInvoice).units}
                                    </div>
                                    <div className="col-span-2 text-center font-mono">
                                        {formatCurrency(isBillingRecord ? company.unitPrice || 0 : (record as ManagedCompanyInvoice).pricePerUnit, storeSettings, 'AFN').replace('AFN', '').trim()}
                                    </div>
                                    <div className="col-span-2 text-left font-mono font-black text-slate-900">
                                        {formatCurrency(totalAmount, storeSettings, 'AFN').replace('AFN', '').trim()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Totals Section */}
                        <div className="border-t-2 border-slate-900 pt-4 mb-12 print:pt-2 print:mb-6">
                            <div className="flex justify-between items-center mb-4 print:mb-2">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-black text-slate-500 print:text-[9px]">{totalLabel}</span>
                                    <span className="text-2xl font-black text-slate-900 print:text-xl font-mono" dir="ltr">
                                        {totalAmount.toLocaleString('fa-IR')} <span className="text-sm print:text-xs">AFN</span>
                                    </span>
                                </div>
                                {record.status === 'paid' && (
                                    <div className="border-4 border-slate-900 px-4 py-1 rounded-lg">
                                        <span className="text-xl font-black text-slate-900 print:text-lg uppercase tracking-widest">وصول شد</span>
                                    </div>
                                )}
                            </div>
                            <div className="bg-slate-100 p-3 rounded-lg print:p-2 print:bg-slate-50 border border-slate-200">
                                <p className="text-xs font-bold text-slate-700 print:text-[9px] leading-relaxed">
                                    مبلغ به حروف: <span className="text-slate-900">{numberToPersianWords(totalAmount)} افغانی</span>
                                </p>
                                {isBillingRecord && (record as CustomerBillingRecord).isMinimumFeeApplied && (
                                    <p className="text-[10px] font-black text-red-600 mt-1 print:text-[8px]">
                                        * توجه: حداقل هزینه خدمات (۱۰۰ افغانی) برای این دوره اعمال گردیده است.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Signatures Section */}
                        <div className="grid grid-cols-3 gap-4 text-center mb-12 print:mb-6 print:gap-2">
                            <div className="space-y-6 print:space-y-4">
                                <p className="text-[10px] font-black text-slate-500 print:text-[8px]">{registrarLabel}</p>
                                <div className="h-px bg-slate-300 w-3/4 mx-auto"></div>
                                <p className="text-xs font-bold text-slate-900 print:text-[10px]">{registrarValue || '---'}</p>
                            </div>
                            <div className="space-y-6 print:space-y-4">
                                <p className="text-[10px] font-black text-slate-500 print:text-[8px]">نام وصول‌کننده</p>
                                <div className="h-px bg-slate-300 w-3/4 mx-auto"></div>
                                <p className="text-xs font-bold text-slate-900 print:text-[10px]">{collectorValue}</p>
                            </div>
                            <div className="space-y-6 print:space-y-4">
                                <p className="text-[10px] font-black text-slate-500 print:text-[8px]">مهر و امضاء شرکت</p>
                                <div className="h-px bg-slate-300 w-3/4 mx-auto"></div>
                                <div className="h-8"></div>
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="text-center pt-6 border-t border-dashed border-slate-300 print:pt-4">
                            <p className="text-[10px] font-bold text-slate-500 print:text-[8px] mb-1">{storeSettings.address}</p>
                            <p className="text-[10px] font-black text-slate-900 print:text-[9px]">تلفن پشتیبانی: <span className="font-mono">{storeSettings.phone}</span></p>
                            <div className="mt-4 print:mt-2 opacity-20 grayscale">
                                <p className="text-[8px] font-mono">POWERED BY VENDURA SMART BUSINESS SYSTEMS</p>
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
