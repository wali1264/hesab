export interface PermissionModel {
    id: string;
    name: string;
    group: string;
    hidden?: boolean;
}

export const ALL_PERMISSIONS: PermissionModel[] = [
    // Pages
    { id: 'page:dashboard', name: 'مشاهده داشبورد', group: 'صفحات' },
    { id: 'page:inventory', name: 'مشاهده انبارداری', group: 'صفحات', hidden: true },
    { id: 'page:pos', name: 'مشاهده فروش', group: 'صفحات', hidden: true },
    { id: 'page:purchases', name: 'مشاهده خرید', group: 'صفحات', hidden: true },
    { id: 'page:in_transit', name: 'مشاهده اجناس در راه', group: 'صفحات', hidden: true },
    { id: 'page:accounting', name: 'مشاهده حسابداری', group: 'صفحات', hidden: true },
    { id: 'page:deposits', name: 'مشاهده امانات', group: 'صفحات', hidden: true },
    { id: 'page:reports', name: 'مشاهده گزارشات', group: 'صفحات', hidden: true },
    { id: 'page:settings', name: 'مشاهده تنظیمات', group: 'صفحات' },
    { id: 'page:orders', name: 'مشاهده سفارشات', group: 'صفحات', hidden: true },
    { id: 'page:company_management', name: 'مشاهده مدیریت شرکت‌ها', group: 'صفحات' },
    { id: 'page:salary_management', name: 'مشاهده مدیریت حقوق', group: 'صفحات' },

    // Orders
    { id: 'orders:create', name: 'ثبت سفارش جدید', group: 'سفارشات', hidden: true },
    { id: 'orders:edit', name: 'ویرایش وضعیت سفارش', group: 'سفارشات', hidden: true },
    { id: 'orders:delete', name: 'حذف سفارش', group: 'سفارشات', hidden: true },
    { id: 'orders:add_payment', name: 'ثبت پرداخت سفارش', group: 'سفارشات', hidden: true },

    // Inventory
    { id: 'inventory:add_product', name: 'افزودن محصول', group: 'انبارداری', hidden: true },
    { id: 'inventory:edit_product', name: 'ویرایش محصول', group: 'انبارداری', hidden: true },
    { id: 'inventory:delete_product', name: 'حذف محصول', group: 'انبارداری', hidden: true },

    // Point of Sale (POS)
    { id: 'pos:create_invoice', name: 'ثبت فاکتور فروش', group: 'فروش', hidden: true },
    { id: 'pos:edit_invoice', name: 'ویرایش فاکتور فروش', group: 'فروش', hidden: true },
    { id: 'pos:apply_discount', name: 'اعمال تخفیف', group: 'فروش', hidden: true },
    { id: 'pos:create_credit_sale', name: 'فروش نسیه', group: 'فروش', hidden: true },
    
    // Purchases
    { id: 'purchase:create_invoice', name: 'ثبت فاکتور خرید', group: 'خرید', hidden: true },
    { id: 'purchase:edit_invoice', name: 'ویرایش فاکتور خرید', group: 'خرید', hidden: true },

    // In Transit
    { id: 'in_transit:confirm_receipt', name: 'تأیید وصول کالا', group: 'اجناس در راه', hidden: true },

    // Accounting
    { id: 'accounting:manage_suppliers', name: 'مدیریت تأمین‌کنندگان', group: 'حسابداری', hidden: true },
    { id: 'accounting:manage_customers', name: 'مدیریت مشتریان', group: 'حسابداری', hidden: true },
    { id: 'accounting:manage_payroll', name: 'مدیریت حقوق و دستمزد', group: 'حسابداری', hidden: true },
    { id: 'accounting:manage_expenses', name: 'مدیریت مصارف', group: 'حسابداری', hidden: true },
    { id: 'accounting:manage_deposits', name: 'مدیریت امانات', group: 'حسابداری', hidden: true },

    // Settings (Super Admin / Owner level)
    { id: 'settings:manage_store', name: 'تغییر مشخصات فروشگاه', group: 'تنظیمات', hidden: true },
    { id: 'settings:manage_users', name: 'مدیریت کاربران و نقش‌ها', group: 'تنظیمات' },
    { id: 'settings:manage_backup', name: 'پشتیبان‌گیری و بازیابی', group: 'تنظیمات' },
    { id: 'settings:manage_services', name: 'مدیریت خدمات', group: 'تنظیمات', hidden: true },
    { id: 'settings:manage_alerts', name: 'مدیریت هشدارها', group: 'تنظیمات', hidden: true },

    // Company Management
    { id: 'company:create', name: 'ثبت شرکت جدید', group: 'مدیریت شرکت‌ها' },
    { id: 'company:edit', name: 'ویرایش شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company:delete', name: 'حذف شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company:view_stats', name: 'مشاهده آمار مالی شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company:view_profit_loss', name: 'مشاهده سود و ضرر شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company:view_ledger', name: 'مشاهده دفتر کل شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company:view_customers', name: 'مشاهده لیست مشتریان شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company:view_collections', name: 'مشاهده وصولی‌های شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company:view_dashboard', name: 'مشاهده داشبورد مدیریتی شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company:view_activities', name: 'مشاهده گزارش فعالیت‌ها', group: 'مدیریت شرکت‌ها' },
    { id: 'company:view_charts', name: 'مشاهده نمودارهای شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company:view_reports', name: 'مشاهده و دانلود گزارشات اکسل', group: 'مدیریت شرکت‌ها' },
    { id: 'company:view_main', name: 'مشاهده تب مدیریت شرکت‌ها', group: 'مدیریت شرکت‌ها' },
    { id: 'company_customer:create', name: 'ثبت مشتری جدید شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company_customer:edit', name: 'ویرایش مشتری شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company_customer:delete', name: 'حذف مشتری شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company_billing:create', name: 'ثبت میترخوانی جدید', group: 'مدیریت شرکت‌ها' },
    { id: 'company_billing:settle', name: 'وصول طلبات (تسویه)', group: 'مدیریت شرکت‌ها' },
    { id: 'company:manage_payroll', name: 'مدیریت معاشات (حقوق)', group: 'مدیریت شرکت‌ها' },
];

export const groupPermissions = (permissions: PermissionModel[]) => {
    return permissions.reduce((acc, permission) => {
        (acc[permission.group] = acc[permission.group] || []).push(permission);
        return acc;
    }, {} as Record<string, PermissionModel[]>);
};