import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { 
    UserGroupIcon, 
    PlusIcon, 
    PencilIcon, 
    TrashIcon, 
    BanknotesIcon, 
    HistoryIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    BellIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    CalendarIcon,
    CurrencyDollarIcon,
    PhoneIcon,
    IdentificationIcon,
    ArrowPathIcon
} from '../components/icons';
import { CompanyEmployee, SalaryMonthRecord, SalaryPayment } from '../types';
import JalaliDateInput from '../components/JalaliDateInput';
import ConfirmModal from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';

const SalaryManagement: React.FC = () => {
    const { 
        companyEmployees, 
        salaryRecords, 
        salaryPayments, 
        addCompanyEmployee, 
        updateCompanyEmployee, 
        deleteCompanyEmployee,
        addSalaryPayment,
        updateSalaryPayment,
        deleteSalaryPayment,
        settleSalaryMonth,
        generateMonthlySalaryRecords,
        storeSettings,
        showToast
    } = useAppContext();

    const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'alerts'>('payroll');
    const [selectedEmployee, setSelectedEmployee] = useState<CompanyEmployee | null>(null);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState<{ type: 'employee' | 'payment', id: string } | null>(null);
    
    // Payroll state
    const [currentYear, setCurrentYear] = useState(new Date().toLocaleDateString('fa-IR-u-nu-latn', { year: 'numeric' }));
    const [currentMonth, setCurrentMonth] = useState(parseInt(new Date().toLocaleDateString('fa-IR-u-nu-latn', { month: 'numeric' })));
    
    const jalaliYear = parseInt(currentYear);
    const jalaliMonth = currentMonth;

    const [employeeFormData, setEmployeeFormData] = useState<Omit<CompanyEmployee, 'id' | 'isActive'>>({
        name: '',
        phone: '',
        position: '',
        monthlySalary: 0,
        salaryCurrency: 'AFN',
        startDate: new Date().toISOString()
    });

    const [paymentFormData, setPaymentFormData] = useState<Omit<SalaryPayment, 'id'>>({
        employeeId: '',
        recordId: '',
        amount: 0,
        currency: 'AFN',
        date: new Date().toISOString(),
        type: 'advance',
        description: ''
    });

    const months = [
        'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
        'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'
    ];

    // Calculations
    const currentMonthRecords = useMemo(() => {
        return salaryRecords.filter(r => r.year === jalaliYear && r.month === jalaliMonth);
    }, [salaryRecords, jalaliYear, jalaliMonth]);

    const getEmployeePayments = (employeeId: string, recordId?: string) => {
        return salaryPayments.filter(p => p.employeeId === employeeId && (!recordId || p.recordId === recordId));
    };

    const calculateBalance = (record: SalaryMonthRecord) => {
        const payments = getEmployeePayments(record.employeeId, record.id);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        return record.baseSalary - totalPaid;
    };

    // Alerts
    const alerts = useMemo(() => {
        const today = new Date();
        const alertDays = storeSettings.salaryAlertDays || 3;
        const upcomingAlerts: any[] = [];

        companyEmployees.filter(e => e.isActive).forEach(emp => {
            // Logic: If today is within X days of the end of the month or a specific day
            // For now, let's say if it's after the 25th of the month
            const dayOfMonth = parseInt(new Date().toLocaleDateString('fa-IR-u-nu-latn', { day: 'numeric' }));
            if (dayOfMonth >= 25) {
                const record = salaryRecords.find(r => r.employeeId === emp.id && r.year === jalaliYear && r.month === jalaliMonth);
                if (!record || record.status !== 'settled') {
                    upcomingAlerts.push({
                        id: emp.id,
                        title: `موعد پرداخت حقوق: ${emp.name}`,
                        description: `حقوق ماه ${months[jalaliMonth - 1]} هنوز تصفیه نشده است.`,
                        type: 'warning'
                    });
                }
            }
        });

        return upcomingAlerts;
    }, [companyEmployees, salaryRecords, jalaliYear, jalaliMonth, storeSettings.salaryAlertDays]);

    // Handlers
    const handleSaveEmployee = async () => {
        if (!employeeFormData.name || employeeFormData.monthlySalary <= 0) {
            showToast('لطفاً نام و مبلغ حقوق را وارد کنید.');
            return;
        }

        if (selectedEmployee) {
            await updateCompanyEmployee({ ...selectedEmployee, ...employeeFormData });
        } else {
            await addCompanyEmployee(employeeFormData);
        }
        setShowEmployeeModal(false);
        setSelectedEmployee(null);
    };

    const handleSavePayment = async () => {
        if (paymentFormData.amount <= 0) {
            showToast('مبلغ پرداختی باید بیشتر از صفر باشد.');
            return;
        }

        await addSalaryPayment(paymentFormData);
        setShowPaymentModal(false);
    };

    const handleGenerateRecords = async () => {
        const res = await generateMonthlySalaryRecords(jalaliYear, jalaliMonth);
        showToast(res.message);
    };

    const handleSettle = async (recordId: string) => {
        const res = await settleSalaryMonth(recordId);
        showToast(res.message);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <BanknotesIcon className="w-10 h-10 text-blue-600" />
                        مدیریت حقوق و معاشات
                    </h1>
                    <p className="text-slate-500 mt-1">مدیریت متمرکز کارکنان و پرداخت‌های ماهانه</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setActiveTab('alerts')}
                        className={`relative p-3 rounded-2xl transition-all ${activeTab === 'alerts' ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'}`}
                    >
                        <BellIcon className="w-6 h-6" />
                        {alerts.length > 0 && (
                            <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                        )}
                    </button>
                    
                    <button 
                        onClick={() => {
                            setSelectedEmployee(null);
                            setEmployeeFormData({
                                name: '',
                                phone: '',
                                position: '',
                                monthlySalary: 0,
                                salaryCurrency: 'AFN',
                                startDate: new Date().toISOString()
                            });
                            setShowEmployeeModal(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                    >
                        <PlusIcon className="w-5 h-5" />
                        افزودن کارمند
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
                <button 
                    onClick={() => setActiveTab('payroll')}
                    className={`px-8 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'payroll' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    لیست حقوق ماهانه
                </button>
                <button 
                    onClick={() => setActiveTab('employees')}
                    className={`px-8 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'employees' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    مدیریت کارکنان
                </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'payroll' && (
                    <motion.div 
                        key="payroll"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        {/* Month Selector */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => {
                                        if (currentMonth === 1) {
                                            setCurrentMonth(12);
                                            setCurrentYear((parseInt(currentYear) - 1).toString());
                                        } else {
                                            setCurrentMonth(currentMonth - 1);
                                        }
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <ChevronRightIcon className="w-6 h-6 text-slate-400" />
                                </button>
                                
                                <div className="text-center min-w-[150px]">
                                    <h2 className="text-xl font-bold text-slate-800">{months[currentMonth - 1]} {currentYear}</h2>
                                    <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">دوره پرداخت</p>
                                </div>

                                <button 
                                    onClick={() => {
                                        if (currentMonth === 12) {
                                            setCurrentMonth(1);
                                            setCurrentYear((parseInt(currentYear) + 1).toString());
                                        } else {
                                            setCurrentMonth(currentMonth + 1);
                                        }
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <ChevronLeftIcon className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <button 
                                onClick={handleGenerateRecords}
                                className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-100 transition-all"
                            >
                                <ArrowPathIcon className="w-5 h-5" />
                                بروزرسانی لیست ماه
                            </button>
                        </div>

                        {/* Payroll Table */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="p-5 font-bold text-slate-600">کارمند</th>
                                            <th className="p-5 font-bold text-slate-600">حقوق پایه</th>
                                            <th className="p-5 font-bold text-slate-600">پرداختی‌ها</th>
                                            <th className="p-5 font-bold text-slate-600">باقیمانده</th>
                                            <th className="p-5 font-bold text-slate-600">وضعیت</th>
                                            <th className="p-5 font-bold text-slate-600 text-center">عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {currentMonthRecords.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center text-slate-400">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <CalendarIcon className="w-12 h-12 opacity-20" />
                                                        <p>رکوردی برای این ماه ثبت نشده است.</p>
                                                        <button onClick={handleGenerateRecords} className="text-blue-600 font-bold hover:underline">ایجاد رکوردهای ماه جاری</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            currentMonthRecords.map(record => {
                                                const employee = companyEmployees.find(e => e.id === record.employeeId);
                                                const balance = calculateBalance(record);
                                                const payments = getEmployeePayments(record.employeeId, record.id);
                                                const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

                                                return (
                                                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="p-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                                                                    {employee?.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-800">{employee?.name}</p>
                                                                    <p className="text-xs text-slate-500">{employee?.position}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-5 font-bold text-slate-700">
                                                            {record.baseSalary.toLocaleString()} <span className="text-[10px] text-slate-400">{record.currency}</span>
                                                        </td>
                                                        <td className="p-5">
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedEmployee(employee || null);
                                                                    setShowHistoryModal(true);
                                                                }}
                                                                className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                                                            >
                                                                {totalPaid.toLocaleString()}
                                                                <HistoryIcon className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                        <td className="p-5 font-bold">
                                                            <span className={balance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                                                                {balance.toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="p-5">
                                                            {record.status === 'settled' ? (
                                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                                                    <CheckCircleIcon className="w-4 h-4" />
                                                                    تصفیه شده
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                                                                    <ArrowPathIcon className="w-4 h-4" />
                                                                    در جریان
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-5">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button 
                                                                    onClick={() => {
                                                                        setPaymentFormData({
                                                                            employeeId: record.employeeId,
                                                                            recordId: record.id,
                                                                            amount: balance > 0 ? balance : 0,
                                                                            currency: record.currency,
                                                                            date: new Date().toISOString(),
                                                                            type: balance > 0 ? 'advance' : 'salary',
                                                                            description: ''
                                                                        });
                                                                        setShowPaymentModal(true);
                                                                    }}
                                                                    disabled={record.status === 'settled'}
                                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30"
                                                                    title="ثبت پرداختی"
                                                                >
                                                                    <PlusIcon className="w-5 h-5" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleSettle(record.id)}
                                                                    disabled={record.status === 'settled'}
                                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-30"
                                                                    title="تصفیه نهایی"
                                                                >
                                                                    <CheckCircleIcon className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'employees' && (
                    <motion.div 
                        key="employees"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {companyEmployees.map(emp => (
                            <div key={emp.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 hover:shadow-md transition-all group">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-xl font-bold">
                                            {emp.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">{emp.name}</h3>
                                            <p className="text-sm text-slate-500">{emp.position}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => {
                                                setSelectedEmployee(emp);
                                                setEmployeeFormData({
                                                    name: emp.name,
                                                    phone: emp.phone,
                                                    position: emp.position,
                                                    monthlySalary: emp.monthlySalary,
                                                    salaryCurrency: emp.salaryCurrency,
                                                    startDate: emp.startDate
                                                });
                                                setShowEmployeeModal(true);
                                            }}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        >
                                            <PencilIcon className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => setShowConfirmDelete({ type: 'employee', id: emp.id })}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">حقوق ماهانه</p>
                                        <p className="font-bold text-slate-700">{emp.monthlySalary.toLocaleString()} <span className="text-[10px]">{emp.salaryCurrency}</span></p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">تاریخ شروع</p>
                                        <p className="font-bold text-slate-700">{new Date(emp.startDate).toLocaleDateString('fa-IR')}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">شماره تماس</p>
                                        <p className="font-bold text-slate-700 flex items-center gap-2">
                                            <PhoneIcon className="w-4 h-4 text-slate-300" />
                                            {emp.phone || 'ثبت نشده'}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold ${emp.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {emp.isActive ? 'فعال' : 'غیرفعال'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {activeTab === 'alerts' && (
                    <motion.div 
                        key="alerts"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="max-w-2xl mx-auto space-y-4"
                    >
                        {alerts.length === 0 ? (
                            <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 text-center space-y-3">
                                <CheckCircleIcon className="w-16 h-16 text-emerald-100 mx-auto" />
                                <h3 className="text-xl font-bold text-slate-800">هیچ هشداری وجود ندارد</h3>
                                <p className="text-slate-500">تمامی پرداخت‌ها در وضعیت مناسب هستند.</p>
                            </div>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} className="bg-white p-5 rounded-2xl shadow-sm border-r-4 border-amber-500 flex items-start gap-4">
                                    <div className="p-2 bg-amber-50 rounded-xl">
                                        <BellIcon className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{alert.title}</h4>
                                        <p className="text-sm text-slate-500 mt-1">{alert.description}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Employee Modal */}
            {showEmployeeModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <IdentificationIcon className="w-6 h-6 text-blue-600" />
                                {selectedEmployee ? 'ویرایش اطلاعات کارمند' : 'افزودن کارمند جدید'}
                            </h3>
                            <button onClick={() => setShowEmployeeModal(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                                <XCircleIcon className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 mr-1">نام و نام خانوادگی</label>
                                <input 
                                    type="text"
                                    value={employeeFormData.name}
                                    onChange={e => setEmployeeFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                    placeholder="مثلاً: احمد محمدی"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 mr-1">شماره تماس</label>
                                    <input 
                                        type="text"
                                        value={employeeFormData.phone}
                                        onChange={e => setEmployeeFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                        placeholder="07XXXXXXXX"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 mr-1">سمت / وظیفه</label>
                                    <input 
                                        type="text"
                                        value={employeeFormData.position}
                                        onChange={e => setEmployeeFormData(prev => ({ ...prev, position: e.target.value }))}
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                        placeholder="مثلاً: مدیر فروش"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 mr-1">حقوق ماهانه</label>
                                    <input 
                                        type="number"
                                        value={employeeFormData.monthlySalary}
                                        onChange={e => setEmployeeFormData(prev => ({ ...prev, monthlySalary: parseFloat(e.target.value) }))}
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 mr-1">واحد پولی</label>
                                    <select 
                                        value={employeeFormData.salaryCurrency}
                                        onChange={e => setEmployeeFormData(prev => ({ ...prev, salaryCurrency: e.target.value as any }))}
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                    >
                                        <option value="AFN">افغانی (AFN)</option>
                                        <option value="USD">دلار (USD)</option>
                                        <option value="IRT">تومان (IRT)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 mr-1">تاریخ شروع به کار</label>
                                <JalaliDateInput 
                                    value={employeeFormData.startDate}
                                    onChange={date => setEmployeeFormData(prev => ({ ...prev, startDate: date }))}
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                            <button 
                                onClick={handleSaveEmployee}
                                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                            >
                                ذخیره اطلاعات
                            </button>
                            <button 
                                onClick={() => setShowEmployeeModal(false)}
                                className="flex-1 bg-white text-slate-600 py-4 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all"
                            >
                                انصراف
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <BanknotesIcon className="w-6 h-6 text-emerald-600" />
                                ثبت پرداختی جدید
                            </h3>
                            <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                                <XCircleIcon className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 mr-1">مبلغ پرداختی</label>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        value={paymentFormData.amount}
                                        onChange={e => setPaymentFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 focus:ring-2 focus:ring-blue-500 transition-all font-bold text-2xl"
                                    />
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">{paymentFormData.currency}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 mr-1">نوع پرداخت</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setPaymentFormData(prev => ({ ...prev, type: 'advance' }))}
                                        className={`py-3 rounded-xl font-bold border-2 transition-all ${paymentFormData.type === 'advance' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-slate-100 text-slate-500'}`}
                                    >
                                        مساعده
                                    </button>
                                    <button 
                                        onClick={() => setPaymentFormData(prev => ({ ...prev, type: 'salary' }))}
                                        className={`py-3 rounded-xl font-bold border-2 transition-all ${paymentFormData.type === 'salary' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-100 text-slate-500'}`}
                                    >
                                        حقوق
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 mr-1">تاریخ پرداخت</label>
                                <JalaliDateInput 
                                    value={paymentFormData.date}
                                    onChange={date => setPaymentFormData(prev => ({ ...prev, date }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 mr-1">توضیحات (اختیاری)</label>
                                <textarea 
                                    value={paymentFormData.description}
                                    onChange={e => setPaymentFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all font-bold h-24 resize-none"
                                    placeholder="توضیحات مربوط به این پرداخت..."
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                            <button 
                                onClick={handleSavePayment}
                                className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                            >
                                ثبت پرداخت
                            </button>
                            <button 
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 bg-white text-slate-600 py-4 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all"
                            >
                                انصراف
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && selectedEmployee && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                    >
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <HistoryIcon className="w-6 h-6 text-blue-600" />
                                تاریخچه پرداختی‌های {selectedEmployee.name}
                            </h3>
                            <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                                <XCircleIcon className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-4">
                                {getEmployeePayments(selectedEmployee.id).length === 0 ? (
                                    <p className="text-center text-slate-400 py-8">هیچ پرداختی ثبت نشده است.</p>
                                ) : (
                                    getEmployeePayments(selectedEmployee.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${p.type === 'advance' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {p.type === 'advance' ? 'م' : 'ح'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{p.amount.toLocaleString()} {p.currency}</p>
                                                    <p className="text-xs text-slate-500">{new Date(p.date).toLocaleDateString('fa-IR')} - {p.description || (p.type === 'advance' ? 'مساعده' : 'حقوق')}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setShowConfirmDelete({ type: 'payment', id: p.id })}
                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                            <button 
                                onClick={() => setShowHistoryModal(false)}
                                className="w-full bg-white text-slate-600 py-4 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all"
                            >
                                بستن
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Confirm Delete */}
            {showConfirmDelete && (
                <ConfirmModal 
                    isOpen={true}
                    onClose={() => setShowConfirmDelete(null)}
                    onConfirm={async () => {
                        if (showConfirmDelete.type === 'employee') {
                            await deleteCompanyEmployee(showConfirmDelete.id);
                        } else {
                            await deleteSalaryPayment(showConfirmDelete.id);
                        }
                        setShowConfirmDelete(null);
                    }}
                    title="تأیید حذف"
                    message={showConfirmDelete.type === 'employee' ? "آیا از حذف این کارمند اطمینان دارید؟ تمام سوابق وی نیز حذف خواهد شد." : "آیا از حذف این رکورد پرداختی اطمینان دارید؟"}
                />
            )}
        </div>
    );
};

export default SalaryManagement;
