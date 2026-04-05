
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
                    <div className="printable-area bg-white shadow-lg mx-auto p-8 border border-slate-200 rounded-sm min-h-[29.7cm] w-full max-w-[21cm] text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:min-h-0" dir="rtl">
                        <div className="flex justify-between items-start border-b-2 border-blue-600 pb-6 mb-8">
                            <div className="space-y-1">
                                <h1 className="text-2xl font-black text-blue-800">{company.name}</h1>
                                <p className="text-sm font-bold text-slate-500">
                                    {isBillingRecord ? 'مدیریت آبرسانی و خدمات فنی' : 'تولید و توزیع محصولات'}
                                </p>
                            </div>
                            <div className="text-left space-y-1">
                                <h2 className="text-xl font-black text-slate-700">{headerTitle}</h2>
                                <p className="text-sm font-bold text-slate-500">تاریخ: {formatJalaliDate(record.date)}</p>
                                <p className="text-xs font-bold text-slate-400">شماره: {record.id.slice(-6).toUpperCase()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400">نام مشترک:</span>
                                    <span className="text-sm font-black text-slate-800">{customer.name} {customer.fatherName ? `فرزند ${customer.fatherName}` : ''}</span>
                                </div>
                                {isBillingRecord && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400">شماره میتر:</span>
                                        <span className="text-sm font-black text-slate-800">{customer.meterNumber || '---'}</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400">آدرس:</span>
                                    <span className="text-sm font-black text-slate-800">{customer.address || '---'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400">شماره تماس:</span>
                                    <span className="text-sm font-black text-slate-800" dir="ltr">{customer.phone || '---'}</span>
                                </div>
                            </div>
                        </div>

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

                        <div className="flex flex-col items-end gap-4 mb-12">
                            <div className="w-full max-w-xs bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 relative overflow-hidden">
                                {record.status === 'paid' && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-4 border-emerald-500/30 text-emerald-500/30 px-6 py-2 rounded-xl text-4xl font-black pointer-events-none uppercase">
                                        وصول شد
                                    </div>
                                )}
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-slate-500">{totalLabel}</span>
                                    <span className="text-xl font-black text-blue-800">{formatCurrency(totalAmount, storeSettings, 'AFN')}</span>
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 text-left border-t border-slate-200 pt-2">
                                    مبلغ به حروف: {numberToPersianWords(totalAmount)} افغانی
                                </div>
                                {isBillingRecord && (record as CustomerBillingRecord).isMinimumFeeApplied && (
                                    <div className="mt-2 text-[10px] font-bold text-red-500">
                                        * حداقل هزینه خدمات (۱۰۰ افغانی) اعمال شده است.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-8 mt-auto pt-12 border-t border-slate-100 text-center">
                            <div className="space-y-4">
                                <p className="text-xs font-bold text-slate-400">{registrarLabel}</p>
                                <div className="h-12 flex items-center justify-center font-black text-slate-800">{registrarValue || '---'}</div>
                                <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-300">امضاء</div>
                            </div>
                            <div className="space-y-4">
                                <p className="text-xs font-bold text-slate-400">نام وصول‌کننده</p>
                                <div className="h-12 flex items-center justify-center font-black text-slate-800">{collectorValue}</div>
                                <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-300">امضاء</div>
                            </div>
                            <div className="space-y-4">
                                <p className="text-xs font-bold text-slate-400">مهر و امضاء شرکت</p>
                                <div className="h-12"></div>
                                <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-300">مهر معتبر</div>
                            </div>
                        </div>
                        
                        <div className="mt-12 text-center space-y-1 text-[10px] font-bold text-slate-400">
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
