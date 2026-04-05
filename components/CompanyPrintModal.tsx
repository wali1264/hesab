
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
                        {/* Stable Frame Container with 2mm Safe Margin */}
                        <div className="printable-area bg-white mx-auto p-[2mm] rounded-sm w-full max-w-[21cm] text-slate-900 print:p-[2mm] print:m-0 print:w-full print:max-w-none print:min-h-0 font-sans border border-slate-300 shadow-sm" dir="rtl">
                            
                            {/* 1. GRAPHIC HEADER - Curved Design */}
                            <div className="relative bg-blue-900 text-white p-6 mb-6 rounded-bl-[80px] overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-800 to-blue-950 opacity-50"></div>
                                <div className="relative z-10 flex justify-between items-start">
                                    <div className="text-right">
                                        <h1 className="text-3xl font-black tracking-tighter text-amber-400 mb-1">{company.name}</h1>
                                        <p className="text-xs font-bold opacity-90 tracking-widest">
                                            {isBillingRecord ? 'مدیریت آبرسانی و خدمات فنی' : 'تولید و توزیع محصولات صنعتی'}
                                        </p>
                                    </div>
                                    <div className="text-left bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
                                        <h2 className="text-xl font-black text-amber-400 uppercase tracking-tighter">
                                            {isBillingRecord ? 'قبض مصرف آب' : 'فاکتور فروش'}
                                        </h2>
                                        <p className="text-[10px] font-bold opacity-70 mt-1 text-left">Sales Invoice</p>
                                    </div>
                                </div>
                            </div>

                            {/* 2. METADATA BOXES - Organized & Clean */}
                            <div className="grid grid-cols-3 gap-4 mb-6 px-2">
                                <div className="border-2 border-blue-900/10 rounded-lg p-2 bg-slate-50/50">
                                    <p className="text-[9px] font-black text-blue-900/40 uppercase mb-1">تاریخ صدور:</p>
                                    <p className="text-xs font-black font-mono text-blue-950">{new Date(record.date).toLocaleDateString('fa-IR')}</p>
                                </div>
                                <div className="border-2 border-blue-900/10 rounded-lg p-2 bg-slate-50/50">
                                    <p className="text-[9px] font-black text-blue-900/40 uppercase mb-1">شماره سریال:</p>
                                    <p className="text-xs font-black font-mono text-blue-950">{record.id.slice(-8).toUpperCase()}</p>
                                </div>
                                <div className="border-2 border-blue-900/10 rounded-lg p-2 bg-slate-50/50">
                                    <p className="text-[9px] font-black text-blue-900/40 uppercase mb-1">ساعت ثبت:</p>
                                    <p className="text-xs font-black font-mono text-blue-950">{new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>

                            {/* 3. CUSTOMER INFO - Professional Layout */}
                            <div className="mb-6 px-2 flex justify-between items-end border-b-2 border-blue-900/5 pb-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-blue-900/40 uppercase">مشخصات خریدار / مشترک:</p>
                                    <h3 className="text-lg font-black text-blue-950">{customer.name} {customer.fatherName ? `فرزند ${customer.fatherName}` : ''}</h3>
                                </div>
                                {isBillingRecord && (
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-blue-900/40 uppercase">کد اشتراک:</p>
                                        <p className="text-sm font-black font-mono text-blue-950">{customer.meterNumber || '---'}</p>
                                    </div>
                                )}
                            </div>

                            {/* 4. EXCEL-LIKE STRUCTURED TABLE */}
                            <div className="mb-6 px-2">
                                <table className="w-full border-collapse rounded-xl overflow-hidden border-2 border-blue-900/10">
                                    <thead>
                                        <tr className="bg-blue-900 text-white text-[11px] font-black">
                                            <th className="p-3 text-right border-l border-white/10">شرح کالا / خدمات</th>
                                            {isBillingRecord ? (
                                                <>
                                                    <th className="p-3 text-center border-l border-white/10">قراءت قبلی</th>
                                                    <th className="p-3 text-center border-l border-white/10">قراءت فعلی</th>
                                                    <th className="p-3 text-center border-l border-white/10">مصرف</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="p-3 text-center border-l border-white/10">تعداد / مقدار</th>
                                                    <th className="p-3 text-center border-l border-white/10">قیمت واحد</th>
                                                </>
                                            )}
                                            <th className="p-3 text-left">جمع کل (افغانی)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-black text-blue-950">
                                        <tr className="bg-white border-b border-blue-900/5">
                                            <td className="p-4 border-l border-blue-900/5">
                                                {isBillingRecord ? 'مصرف آب دوره جاری' : (record as ManagedCompanyInvoice).description || 'فروش محصول'}
                                            </td>
                                            {isBillingRecord ? (
                                                <>
                                                    <td className="p-4 text-center border-l border-blue-900/5 font-mono">{(record as CustomerBillingRecord).previousReading}</td>
                                                    <td className="p-4 text-center border-l border-blue-900/5 font-mono">{(record as CustomerBillingRecord).currentReading}</td>
                                                    <td className="p-4 text-center border-l border-blue-900/5 font-mono">{(record as CustomerBillingRecord).consumption}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="p-4 text-center border-l border-blue-900/5 font-mono">{(record as ManagedCompanyInvoice).units}</td>
                                                    <td className="p-4 text-center border-l border-blue-900/5 font-mono">{(record as ManagedCompanyInvoice).pricePerUnit.toLocaleString('fa-IR')}</td>
                                                </>
                                            )}
                                            <td className="p-4 text-left font-mono text-sm">
                                                {totalAmount.toLocaleString('fa-IR')}
                                            </td>
                                        </tr>
                                        {/* Empty rows for Excel feel */}
                                        {[1, 2].map(i => (
                                            <tr key={i} className="bg-slate-50/30 border-b border-blue-900/5 h-10">
                                                <td className="border-l border-blue-900/5"></td>
                                                {isBillingRecord ? (
                                                    <>
                                                        <td className="border-l border-blue-900/5"></td>
                                                        <td className="border-l border-blue-900/5"></td>
                                                        <td className="border-l border-blue-900/5"></td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="border-l border-blue-900/5"></td>
                                                        <td className="border-l border-blue-900/5"></td>
                                                    </>
                                                )}
                                                <td></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* 5. TOTALS & STATUS - High Impact */}
                            <div className="mb-8 px-2">
                                <div className="flex justify-between items-stretch gap-4">
                                    <div className="flex-1 bg-slate-50 rounded-xl p-4 border-2 border-blue-900/5 flex flex-col justify-center">
                                        <p className="text-[10px] font-black text-blue-900/40 uppercase mb-1">مبلغ به حروف:</p>
                                        <p className="text-xs font-black text-blue-950">{numberToPersianWords(totalAmount)} افغانی</p>
                                    </div>
                                    <div className="bg-blue-900 text-white p-4 rounded-xl flex flex-col items-center justify-center min-w-[180px] shadow-lg shadow-blue-200">
                                        <p className="text-[10px] font-black opacity-60 uppercase mb-1">مبلغ قابل پرداخت</p>
                                        <p className="text-3xl font-black font-mono leading-none" dir="ltr">
                                            {totalAmount.toLocaleString('fa-IR')}
                                        </p>
                                    </div>
                                </div>

                                {record.status === 'paid' && (
                                    <div className="mt-6 text-center relative">
                                        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-blue-900/10 -z-10"></div>
                                        <span className="bg-white text-blue-900 border-4 border-blue-900 px-10 py-2 rounded-full font-black text-2xl uppercase tracking-tighter rotate-[-2deg] inline-block shadow-xl">
                                            تصفیه شد / وصول شد
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* 6. USERS INFO - Accountability */}
                            <div className="grid grid-cols-2 gap-8 mb-8 px-4">
                                <div className="text-right border-r-4 border-blue-900/20 pr-4">
                                    <p className="text-[9px] font-black text-blue-900/40 uppercase mb-1">ثبت‌کننده فاکتور:</p>
                                    <p className="text-xs font-black text-blue-950 truncate">{registrarValue || '---'}</p>
                                </div>
                                <div className="text-left border-l-4 border-blue-900/20 pl-4">
                                    <p className="text-[9px] font-black text-blue-900/40 uppercase mb-1 text-left">مسئول وصول وجه:</p>
                                    <p className="text-xs font-black text-blue-950 truncate text-left">{collectorValue}</p>
                                </div>
                            </div>

                            {/* 7. GRAPHIC FOOTER - Curved Design */}
                            <div className="relative bg-blue-900 text-white p-6 rounded-tr-[80px] overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tl from-blue-800 to-blue-950 opacity-50"></div>
                                <div className="relative z-10 text-center">
                                    <p className="text-xs font-black mb-4 italic text-amber-400">"با تشکر از انتخاب و اعتماد شما؛ رضایت شما سرمایه ماست."</p>
                                    <div className="flex justify-center items-center gap-8 text-[10px] font-bold">
                                        <div className="flex items-center gap-2">
                                            <span className="opacity-60">تلفن پشتیبانی:</span>
                                            <span className="font-mono text-xs">{company.phone || storeSettings.phone}</span>
                                        </div>
                                        {company.managerName && (
                                            <div className="flex items-center gap-2">
                                                <span className="opacity-60">مدیریت:</span>
                                                <span className="text-xs">{company.managerName}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="opacity-60">آدرس:</span>
                                            <span className="text-xs">{company.address || '---'}</span>
                                        </div>
                                    </div>
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
