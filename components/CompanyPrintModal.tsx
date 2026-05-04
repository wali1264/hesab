
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
                        <style dangerouslySetInnerHTML={{ __html: `
                            @media print {
                                @page {
                                    margin: 2mm !important;
                                    size: auto;
                                }
                                .printable-area {
                                    width: 100% !important;
                                    max-width: none !important;
                                    padding: 8mm !important;
                                    border: none !important;
                                    box-shadow: none !important;
                                }
                                /* Scaled up text for print while maintaining structure */
                                .print-title { font-size: 30pt !important; margin-bottom: 1mm !important; }
                                .print-subtitle { font-size: 14pt !important; }
                                .print-header-title { font-size: 26pt !important; margin: 3mm 0 !important; }
                                .print-metadata { font-size: 16pt !important; font-weight: 950 !important; color: #000 !important; }
                                .print-metadata span { font-size: 16pt !important; }
                                .print-label { font-size: 14pt !important; font-weight: 950 !important; color: #000 !important; opacity: 0.8; }
                                .print-customer-name { font-size: 26pt !important; font-weight: 950 !important; margin: 2mm 0 !important; }
                                .print-customer-code { font-size: 18pt !important; font-weight: 950 !important; }
                                .print-item-title { font-size: 26pt !important; font-weight: 950 !important; }
                                .print-readings { font-size: 20pt !important; font-weight: 950 !important; color: #000 !important; margin-top: 5mm !important; border: 2.5px solid #000; padding: 3mm 6mm; border-radius: 5px; display: inline-block; width: 100%; max-width: 15cm; }
                                .print-unit-row { font-size: 24pt !important; font-weight: 950 !important; margin-top: 3mm !important; }
                                .print-fee-info { font-size: 14pt !important; font-weight: 950 !important; color: #000 !important; }
                                .print-total-label { font-size: 18pt !important; font-weight: 950 !important; color: #000 !important; margin-bottom: 1mm !important; }
                                .print-amount-big { font-size: 70pt !important; line-height: 1 !important; margin: 8mm 0 !important; font-weight: 950 !important; }
                                .print-amount-words { font-size: 18pt !important; font-weight: 950 !important; color: #000 !important; display: inline-block; width: 100%; max-width: 15cm; overflow-wrap: break-word; }
                                .print-status-stamp { font-size: 36pt !important; padding: 4mm 12mm !important; border-width: 5px !important; font-weight: 950 !important; margin: 4mm 0 !important; }
                                .print-registrar-box { font-size: 16pt !important; font-weight: 950 !important; }
                                .print-footer-text { font-size: 18pt !important; font-weight: 950 !important; color: #000 !important; margin: 3mm 0 !important; }
                                .print-contact-info { font-size: 14pt !important; font-weight: 950 !important; color: #000 !important; }
                            }
                        ` }} />
                        {/* Global Standard Frame - Flexible Height for Printing */}
                        <div className="printable-area bg-white mx-auto p-[2mm] rounded-sm w-full max-w-[21cm] text-slate-900 print:p-[2mm] print:m-0 print:w-full print:max-w-none print:min-h-0 font-sans text-center" dir="rtl" style={{ minHeight: '100%' }}>
                            
                            {/* Company Header - Reduced Size & Centered */}
                            <div className="mb-2 mt-2 print:mt-4">
                                <h1 className="text-2xl font-black tracking-tight mb-0 print-title leading-tight">{company.name}</h1>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest print-subtitle">
                                    {isBillingRecord ? 'مدیریت آبرسانی و خدمات فنی' : 'تولید و توزیع محصولات'}
                                </p>
                            </div>

                            {/* Title & Metadata - Centered */}
                            <div className="mb-2 space-y-0">
                                <h2 className="text-lg font-black border-y border-slate-900 py-1 inline-block px-12 print-header-title">{headerTitle}</h2>
                                <div className="text-[10px] font-bold space-y-1 mt-1 print-metadata">
                                    <p>تاریخ: <span className="font-mono text-xs">{new Date(record.date).toLocaleDateString('fa-IR')}</span></p>
                                    <p>ساعت: <span className="font-mono text-xs">{new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span></p>
                                    <p>شماره فاکتور: <span className="font-mono text-xs">{record.id.slice(-6).toUpperCase()}</span></p>
                                </div>
                            </div>

                            {/* Customer Info - Reduced Size & Centered */}
                            <div className="mb-4">
                                <p className="text-[8px] font-black text-slate-400 mb-0 uppercase tracking-widest print-label">نام مشتری / مشترک</p>
                                <h3 className="text-xl font-black print-customer-name leading-tight">{customer.name} {customer.fatherName ? `فرزند ${customer.fatherName}` : ''}</h3>
                                {isBillingRecord && (
                                    <p className="text-sm font-mono font-black mt-1 print-customer-code">کد اشتراک: {customer.meterNumber || '---'}</p>
                                )}
                            </div>

                            {/* Items Section - Centered */}
                            <div className="mb-6 space-y-2">
                                <div className="space-y-0">
                                    <div className="text-lg font-black print-item-title">
                                        {isBillingRecord ? 'مقدار مصرف آب دوره' : (record as ManagedCompanyInvoice).description || 'فروش محصول'}
                                    </div>
                                    {isBillingRecord && (
                                        <div className="text-xs text-slate-500 font-mono print-readings leading-relaxed">
                                            قراءت: {(record as CustomerBillingRecord).previousReading} الی {(record as CustomerBillingRecord).currentReading}
                                        </div>
                                    )}
                                    <div className="text-base font-mono font-black text-slate-700 print-unit-row">
                                        {isBillingRecord ? (record as CustomerBillingRecord).consumption : (record as ManagedCompanyInvoice).units} 
                                        {' '} × {' '}
                                        {company.type === CompanyType.WATER ? (
                                            <span className="inline-flex items-center gap-2">
                                                <span>{((isBillingRecord ? company.unitPrice || 0 : (record as ManagedCompanyInvoice).pricePerUnit) / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 4 })}</span>
                                                <span className="text-[10px] print-fee-info">(فی ۱۰۰۰ واحد: {(isBillingRecord ? company.unitPrice || 0 : (record as ManagedCompanyInvoice).pricePerUnit).toLocaleString('fa-IR')})</span>
                                            </span>
                                        ) : (
                                            (isBillingRecord ? company.unitPrice || 0 : (record as ManagedCompanyInvoice).pricePerUnit).toLocaleString('fa-IR')
                                        )}
                                    </div>
                                    {company.hasPrintFee && (
                                        <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-center print:border-slate-900 border-dashed">
                                            <span className="text-[10px] font-bold text-slate-500 print-label">خدمات چاپ فاکتور:</span>
                                            <span className="text-xs font-black text-slate-700 print-metadata">۱۰ افغانی</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Total Amount - Optimized Size & Centered */}
                            <div className="mb-6">
                                <p className="text-xs font-black text-slate-500 mb-1 uppercase tracking-widest print-total-label">مبلغ قابل پرداخت</p>
                                <div className="text-4xl font-black font-mono mb-2 leading-none print-amount-big" dir="ltr">
                                    {Math.floor(totalAmount).toLocaleString('fa-IR')}
                                </div>
                                <div className="print-amount-words leading-snug">
                                    {numberToPersianWords(totalAmount)} افغانی
                                </div>
                            </div>

                            {/* Status - Centered */}
                            {record.status === 'paid' && (
                                <div className="mb-6">
                                    <span className="text-2xl font-black border-2 border-slate-900 px-12 py-2 rounded-xl inline-block rotate-[-3deg] print-status-stamp uppercase">وصول شد</span>
                                </div>
                            )}

                            {/* Users Info - Centered */}
                            <div className="mb-6 space-y-2 border-t-2 border-slate-900 pt-4">
                                <div className="flex justify-center gap-12">
                                    <div className="print-registrar-box">
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0 print-label">{registrarLabel}</p>
                                        <p className="text-xs font-black print-metadata">{registrarValue || '---'}</p>
                                    </div>
                                    <div className="print-registrar-box">
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0 print-label">مدیریت / وصول</p>
                                        <p className="text-xs font-black print-metadata">{collectorValue}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer - Address Replacement */}
                            <div className="pt-2 border-t-2 border-dashed border-slate-900 print:mt-4">
                                <p className="text-xs font-black mb-2 print-footer-text">
                                    آدرس: {customer.address || "---"}
                                </p>
                                <div className="flex justify-center items-center gap-10 text-[10px] font-black text-slate-600 print-contact-info">
                                    <p>تماس: <span className="font-mono">{company.phone || storeSettings.phone}</span></p>
                                    {company.managerName && <p>مسئول: <span>{company.managerName}</span></p>}
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
