export const ALL_PERMISSIONS = [
    // Pages
    { id: 'page:dashboard', name: 'مشاهده داشبورد', group: 'صفحات' },
    { id: 'page:inventory', name: 'مشاهده انبارداری', group: 'صفحات' },
    { id: 'page:pos', name: 'مشاهده فروش', group: 'صفحات' },
    { id: 'page:purchases', name: 'مشاهده خرید', group: 'صفحات' },
    { id: 'page:in_transit', name: 'مشاهده اجناس در راه', group: 'صفحات' },
    { id: 'page:accounting', name: 'مشاهده حسابداری', group: 'صفحات' },
    { id: 'page:deposits', name: 'مشاهده امانات', group: 'صفحات' },
    { id: 'page:reports', name: 'مشاهده گزارشات', group: 'صفحات' },
    { id: 'page:settings', name: 'مشاهده تنظیمات', group: 'صفحات' },
    { id: 'page:orders', name: 'مشاهده سفارشات', group: 'صفحات' },
    { id: 'page:company_management', name: 'مشاهده مدیریت شرکت‌ها', group: 'صفحات' },
    { id: 'page:salary_management', name: 'مشاهده مدیریت حقوق', group: 'صفحات' },

    // Orders
    { id: 'orders:create', name: 'ثبت سفارش جدید', group: 'سفارشات' },
    { id: 'orders:edit', name: 'ویرایش وضعیت سفارش', group: 'سفارشات' },
    { id: 'orders:delete', name: 'حذف سفارش', group: 'سفارشات' },
    { id: 'orders:add_payment', name: 'ثبت پرداخت سفارش', group: 'سفارشات' },

    // Inventory
    { id: 'inventory:add_product', name: 'افزودن محصول', group: 'انبارداری' },
    { id: 'inventory:edit_product', name: 'ویرایش محصول', group: 'انبارداری' },
    { id: 'inventory:delete_product', name: 'حذف محصول', group: 'انبارداری' },

    // Point of Sale (POS)
    { id: 'pos:create_invoice', name: 'ثبت فاکتور فروش', group: 'فروش' },
    { id: 'pos:edit_invoice', name: 'ویرایش فاکتور فروش', group: 'فروش' },
    { id: 'pos:apply_discount', name: 'اعمال تخفیف', group: 'فروش' },
    { id: 'pos:create_credit_sale', name: 'فروش نسیه', group: 'فروش' },
    
    // Purchases
    { id: 'purchase:create_invoice', name: 'ثبت فاکتور خرید', group: 'خرید' },
    { id: 'purchase:edit_invoice', name: 'ویرایش فاکتور خرید', group: 'خرید' },

    // In Transit
    { id: 'in_transit:confirm_receipt', name: 'تأیید وصول کالا', group: 'اجناس در راه' },

    // Accounting
    { id: 'accounting:manage_suppliers', name: 'مدیریت تأمین‌کنندگان', group: 'حسابداری' },
    { id: 'accounting:manage_customers', name: 'مدیریت مشتریان', group: 'حسابداری' },
    { id: 'accounting:manage_payroll', name: 'مدیریت حقوق و دستمزد', group: 'حسابداری' },
    { id: 'accounting:manage_expenses', name: 'مدیریت مصارف', group: 'حسابداری' },
    { id: 'accounting:manage_deposits', name: 'مدیریت امانات', group: 'حسابداری' },

    // Settings (Super Admin / Owner level)
    { id: 'settings:manage_store', name: 'تغییر مشخصات فروشگاه', group: 'تنظیمات' },
    { id: 'settings:manage_users', name: 'مدیریت کاربران و نقش‌ها', group: 'تنظیمات' },
    { id: 'settings:manage_backup', name: 'پشتیبان‌گیری و بازیابی', group: 'تنظیمات' },
    { id: 'settings:manage_services', name: 'مدیریت خدمات', group: 'تنظیمات' },
    { id: 'settings:manage_alerts', name: 'مدیریت هشدارها', group: 'تنظیمات' },

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
    { id: 'company_customer:create', name: 'ثبت مشتری جدید شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company_customer:edit', name: 'ویرایش مشتری شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company_customer:delete', name: 'حذف مشتری شرکت', group: 'مدیریت شرکت‌ها' },
    { id: 'company_billing:create', name: 'ثبت میترخوانی جدید', group: 'مدیریت شرکت‌ها' },
    { id: 'company_billing:settle', name: 'وصول طلبات (تسویه)', group: 'مدیریت شرکت‌ها' },
    { id: 'company:manage_payroll', name: 'مدیریت معاشات (حقوق)', group: 'مدیریت شرکت‌ها' },
];

export const groupPermissions = (permissions: typeof ALL_PERMISSIONS) => {
    return permissions.reduce((acc, permission) => {
        (acc[permission.group] = acc[permission.group] || []).push(permission);
        return acc;
    }, {} as Record<string, typeof ALL_PERMISSIONS>);
};