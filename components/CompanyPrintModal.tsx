
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
                    <div className="printable-area bg-white shadow-lg mx-auto p-8 border border-slate-200 rounded-sm min-h-[29.7cm] w-full max-w-[21cm] text-slate-900 print:shadow-none print:border-none print:p-4 print:m-0 print:w-full print:max-w-none print:min-h-0" dir="rtl">
                        <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-blue-600 pb-6 mb-8 print:pb-2 print:mb-4 print:flex-col print:items-center print:text-center">
                            <div className="space-y-1 print:mb-2">
                                <h1 className="text-2xl font-black text-blue-800 print:text-lg">{company.name}</h1>
                                <p className="text-sm font-bold text-slate-500 print:text-[10px]">
                                    {isBillingRecord ? 'مدیریت آبرسانی و خدمات فنی' : 'تولید و توزیع محصولات'}
                                </p>
                            </div>
                            <div className="text-left md:text-left space-y-1 print:text-center print:w-full">
                                <h2 className="text-xl font-black text-slate-700 print:text-md">{headerTitle}</h2>
                                <p className="text-sm font-bold text-slate-500 print:text-[10px]">تاریخ: {formatJalaliDate(record.date)}</p>
                                <p className="text-xs font-bold text-slate-400 print:text-[8px]">شماره: {record.id.slice(-6).toUpperCase()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white print:border-slate-200 print:p-2 print:mb-4 print:grid-cols-1 print:gap-1">
                            <div className="space-y-2 print:space-y-1">
                                <div className="flex items-center gap-2 print:justify-between">
                                    <span className="text-xs font-bold text-slate-400 print:text-[9px]">نام مشترک:</span>
                                    <span className="text-sm font-black text-slate-800 print:text-[10px]">{customer.name} {customer.fatherName ? `فرزند ${customer.fatherName}` : ''}</span>
                                </div>
                                {isBillingRecord && (
                                    <div className="flex items-center gap-2 print:justify-between">
                                        <span className="text-xs font-bold text-slate-400 print:text-[9px]">شماره میتر:</span>
                                        <span className="text-sm font-black text-slate-800 print:text-[10px]">{customer.meterNumber || '---'}</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2 print:space-y-1">
                                <div className="flex items-center gap-2 print:justify-between">
                                    <span className="text-xs font-bold text-slate-400 print:text-[9px]">آدرس:</span>
                                    <span className="text-sm font-black text-slate-800 print:text-[10px]">{customer.address || '---'}</span>
                                </div>
                                <div className="flex items-center gap-2 print:justify-between">
                                    <span className="text-xs font-bold text-slate-400 print:text-[9px]">شماره تماس:</span>
                                    <span className="text-sm font-black text-slate-800 print:text-[10px]" dir="ltr">{customer.phone || '---'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Standard Table for Desktop/Large Print */}
                        <div className="print:hidden md:block">
                            <table className="w-full border-collapse mb-8">
                                <thead>
                                    <tr className="bg-slate-100 border-b-2 border-slate-200">
                                        <th className="p-3 text-right text-xs font-black text-slate-600">شرح خدمات/کالا</th>
                                        {isBillingRecord && (
                                            <>
                                                <th className="p-3 text-center text-xs font-black text-slate-600">قراءت قبلی</th>
                                                <th className="p-3 text-center text-xs font-black text-slate-600">قراءت فعلی</th>
                                            </>
                                        )}
                                        <th className="p-3 text-center text-xs font-black text-slate-600">تعداد/مقدار</th>
                                        <th className="p-3 text-center text-xs font-black text-slate-600">قیمت واحد</th>
                                        <th className="p-3 text-center text-xs font-black text-slate-600">مجموع</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr className="hover:bg-slate-50/50">
                                        <td className="p-4 text-sm font-bold text-slate-800">
                                            {isBillingRecord ? 'مصرف آب دوره' : (record as ManagedCompanyInvoice).description || 'فروش محصول'}
                                        </td>
                                        {isBillingRecord && (
                                            <>
                                                <td className="p-4 text-center text-sm font-bold text-slate-600">{(record as CustomerBillingRecord).previousReading}</td>
                                                <td className="p-4 text-center text-sm font-bold text-slate-600">{(record as CustomerBillingRecord).currentReading}</td>
                                            </>
                                        )}
                                        <td className="p-4 text-center text-sm font-bold text-slate-800">
                                            {isBillingRecord ? (record as CustomerBillingRecord).consumption : (record as ManagedCompanyInvoice).units} {company.unitName || ''}
                                        </td>
                                        <td className="p-4 text-center text-sm font-bold text-slate-800">
                                            {formatCurrency(isBillingRecord ? company.unitPrice || 0 : (record as ManagedCompanyInvoice).pricePerUnit, storeSettings, 'AFN')}
                                        </td>
                                        <td className="p-4 text-center text-sm font-black text-blue-700">
                                            {formatCurrency(totalAmount, storeSettings, 'AFN')}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Receipt Style for Small Print */}
                        <div className="hidden print:block md:hidden mb-4 border-t border-b border-slate-200 py-2">
                            <div className="space-y-3">
                                <div className="border-b border-slate-100 pb-2">
                                    <p className="text-[11px] font-black text-slate-900 mb-1">
                                        {isBillingRecord ? 'مصرف آب دوره' : (record as ManagedCompanyInvoice).description || 'فروش محصول'}
                                    </p>
                                    {isBillingRecord && (
                                        <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                                            <span>قراءت: {(record as CustomerBillingRecord).previousReading} تا {(record as CustomerBillingRecord).currentReading}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="font-bold text-slate-600">
                                            {isBillingRecord ? (record as CustomerBillingRecord).consumption : (record as ManagedCompanyInvoice).units} {company.unitName || ''} × {formatCurrency(isBillingRecord ? company.unitPrice || 0 : (record as ManagedCompanyInvoice).pricePerUnit, storeSettings, 'AFN')}
                                        </span>
                                        <span className="font-black text-blue-800">
                                            {formatCurrency(totalAmount, storeSettings, 'AFN')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-4 mb-12 print:mb-6">
                            <div className="w-full max-w-xs bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 relative overflow-hidden print:bg-white print:border-slate-300 print:p-3 print:rounded-lg print:max-w-none">
                                {record.status === 'paid' && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-4 border-emerald-500/30 text-emerald-500/30 px-6 py-2 rounded-xl text-4xl font-black pointer-events-none uppercase print:text-2xl print:border-2 print:static print:translate-x-0 print:translate-y-0 print:rotate-0 print:text-emerald-600 print:border-emerald-600 print:mb-2 print:text-center print:block print:w-fit print:mx-auto">
                                        وصول شد
                                    </div>
                                )}
                                <div className="flex justify-between items-center mb-2 print:mb-1">
                                    <span className="text-sm font-bold text-slate-500 print:text-[10px]">{totalLabel}</span>
                                    <span className="text-xl font-black text-blue-800 print:text-lg">{formatCurrency(totalAmount, storeSettings, 'AFN')}</span>
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 text-left border-t border-slate-200 pt-2 print:text-[9px] print:text-center print:text-slate-600">
                                    مبلغ به حروف: {numberToPersianWords(totalAmount)} افغانی
                                </div>
                                {isBillingRecord && (record as CustomerBillingRecord).isMinimumFeeApplied && (
                                    <div className="mt-2 text-[10px] font-bold text-red-500 print:text-center print:text-[8px]">
                                        * حداقل هزینه خدمات (۱۰۰ افغانی) اعمال شده است.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-8 mt-auto pt-12 border-t border-slate-100 text-center print:grid-cols-2 print:gap-4 print:pt-4 print:border-slate-300">
                            <div className="space-y-4 print:space-y-2">
                                <p className="text-xs font-bold text-slate-400 print:text-[9px]">{registrarLabel}</p>
                                <div className="h-12 flex items-center justify-center font-black text-slate-800 print:text-[10px] print:h-8">{registrarValue || '---'}</div>
                                <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-300 print:text-[8px]">امضاء</div>
                            </div>
                            <div className="space-y-4 print:space-y-2">
                                <p className="text-xs font-bold text-slate-400 print:text-[9px]">نام وصول‌کننده</p>
                                <div className="h-12 flex items-center justify-center font-black text-slate-800 print:text-[10px] print:h-8">{collectorValue}</div>
                                <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-300 print:text-[8px]">امضاء</div>
                            </div>
                            <div className="space-y-4 print:space-y-2 print:col-span-2 print:mt-4">
                                <p className="text-xs font-bold text-slate-400 print:text-[9px]">مهر و امضاء شرکت</p>
                                <div className="h-12 print:h-8"></div>
                                <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-300 print:text-[8px]">مهر معتبر</div>
                            </div>
                        </div>
                        
                        <div className="mt-12 text-center space-y-1 text-[10px] font-bold text-slate-400 print:mt-6 print:text-[8px] print:text-slate-500">
                            <p>{storeSettings.address}</p>
                            <p>تلفن تماس: {storeSettings.phone}</p>
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
