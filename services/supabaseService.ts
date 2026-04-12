import { supabase } from '../utils/supabaseClient';
import type { 
    Product, ProductBatch, SaleInvoice, PurchaseInvoice, InTransitInvoice, Supplier, Customer, 
    Employee, Expense, Role, User, StoreSettings, ActivityLog, 
    CustomerTransaction, SupplierTransaction, PayrollTransaction, AppState, Service,
    DepositHolder, DepositTransaction, Company, Partner, ManagedCompany, CompanyLedgerEntry, 
    ManagedCompanyCustomer, CustomerBillingRecord, OwnerTransaction, OwnerExpenseCategory,
    CompanyEmployee, SalaryMonthRecord, SalaryPayment, ManagedCompanyInvoice, ManagedCompanyProductionLog,
    Order, OrderStatus, OrderPayment, WastageRecord
} from '../types';

// Helper to handle Supabase responses
const handleResponse = async <T>(promise: any): Promise<T> => {
    const { data, error } = await promise;
    if (error) {
        console.error("Supabase Error:", error);
        throw new Error(error.message || "خطای پایگاه داده");
    }
    return data as T;
};

// --- USERS & ROLES ---
export const api = {
    // --- AUTH (Custom RPC) ---
    verifyUserLogin: async (username: string, password: string): Promise<User | null> => {
        const { data, error } = await supabase.rpc('verify_user_login', { 
            p_username: username, 
            p_password: password 
        });
        if (error) {
            console.error("Login Error:", error);
            return null;
        }
        return Array.isArray(data) ? data[0] : data;
    },

    // --- SETTINGS ---
    getSettings: async (): Promise<StoreSettings | null> => {
        const data = await handleResponse<any>(supabase.from('store_settings').select('*').eq('id', 'current').maybeSingle());
        return data ? data.data : null;
    },
    updateSettings: async (settings: StoreSettings) => {
        // Strip logos before saving to database to keep it lightweight
        const { logoLeft, logoRight, ...textSettings } = settings;
        await supabase.from('store_settings').upsert({ id: 'current', data: textSettings });
    },

    getUsers: async () => {
        const data = await handleResponse<User[]>(supabase.from('users').select('*'));
        return data || [];
    },
    getRoles: async () => {
        const data = await handleResponse<Role[]>(supabase.from('roles').select('*'));
        return data || [];
    },
    addUser: async (user: Omit<User, 'id'>) => {
        const { data, error } = await supabase.from('users').insert([user]).select().single();
        if (error) throw error;
        return data;
    },
    updateUser: async (user: Partial<User> & { id: string }) => {
        await supabase.from('users').update(user).eq('id', user.id);
    },
    deleteUser: async (id: string) => {
        await supabase.from('users').delete().eq('id', id);
    },
    addRole: async (role: Omit<Role, 'id'>) => {
        const { data, error } = await supabase.from('roles').insert([role]).select().single();
        if (error) throw error;
        return data;
    },
    updateRole: async (role: Role) => {
        await supabase.from('roles').update(role).eq('id', role.id);
    },
    deleteRole: async (id: string) => {
        await supabase.from('roles').delete().eq('id', id);
    },

    // --- PRODUCTS & SERVICES ---
    getProducts: async () => handleResponse(supabase.from('products').select('*')),
    addProduct: async (product: Omit<Product, 'id'|'batches'>, firstBatch: Omit<ProductBatch, 'id'>) => {
        const productId = crypto.randomUUID();
        const batchId = crypto.randomUUID();
        const newProduct: Product = { ...product, id: productId, batches: [{ ...firstBatch, id: batchId }] } as any;
        const { data, error } = await supabase.from('products').insert([newProduct]).select().single();
        if (error) throw error;
        return data;
    },
    updateProduct: async (product: Product) => {
        await supabase.from('products').update(product).eq('id', product.id);
    },
    deleteProduct: async (id: string) => {
        await supabase.from('products').delete().eq('id', id);
    },
    getServices: async () => handleResponse(supabase.from('services').select('*')),
    addService: async (service: Omit<Service, 'id'>) => {
        const { data, error } = await supabase.from('services').insert([service]).select().single();
        if (error) throw error;
        return data;
    },
    deleteService: async (id: string) => {
        await supabase.from('services').delete().eq('id', id);
    },

    // --- ENTITIES ---
    getEntities: async () => {
        const [customers, suppliers, employees, expenses, depositHolders, companies, partners] = await Promise.all([
            handleResponse(supabase.from('customers').select('*')),
            handleResponse(supabase.from('suppliers').select('*')),
            handleResponse(supabase.from('employees').select('*')),
            handleResponse(supabase.from('expenses').select('*')),
            handleResponse(supabase.from('deposit_holders').select('*')),
            handleResponse(supabase.from('companies').select('*')),
            handleResponse(supabase.from('partners').select('*'))
        ]);
        return { 
            customers: customers || [], 
            suppliers: suppliers || [], 
            employees: employees || [], 
            expenses: expenses || [], 
            depositHolders: depositHolders || [], 
            companies: companies || [], 
            partners: partners || [] 
        };
    },
    addCustomer: async (c: any) => {
        const { data, error } = await supabase.from('customers').insert([c]).select().single();
        if (error) throw error;
        return data;
    },
    updateCustomer: async (c: Customer) => {
        await supabase.from('customers').update(c).eq('id', c.id);
    },
    deleteCustomer: async (id: string) => {
        await supabase.from('customers').delete().eq('id', id);
    },
    addSupplier: async (s: any) => {
        const { data, error } = await supabase.from('suppliers').insert([s]).select().single();
        if (error) throw error;
        return data;
    },
    updateSupplier: async (s: Supplier) => {
        await supabase.from('suppliers').update(s).eq('id', s.id);
    },
    deleteSupplier: async (id: string) => {
        await supabase.from('suppliers').delete().eq('id', id);
    },
    addEmployee: async (e: any) => {
        const { data, error } = await supabase.from('employees').insert([e]).select().single();
        if (error) throw error;
        return data;
    },
    updateEmployee: async (e: Employee) => {
        await supabase.from('employees').update(e).eq('id', e.id);
    },
    deleteEmployee: async (id: string) => {
        await supabase.from('employees').delete().eq('id', id);
    },
    addExpense: async (e: any) => {
        const { data, error } = await supabase.from('expenses').insert([e]).select().single();
        if (error) throw error;
        return data;
    },
    updateExpense: async (e: Expense) => {
        await supabase.from('expenses').update(e).eq('id', e.id);
    },
    deleteExpense: async (id: string) => {
        await supabase.from('expenses').delete().eq('id', id);
    },

    // --- DEPOSITS ---
    addDepositHolder: async (holder: any) => {
        const { data, error } = await supabase.from('deposit_holders').insert([holder]).select().single();
        if (error) throw error;
        return data;
    },
    updateDepositHolder: async (holder: DepositHolder) => {
        await supabase.from('deposit_holders').update(holder).eq('id', holder.id);
    },
    deleteDepositHolder: async (id: string) => {
        await supabase.from('deposit_holders').delete().eq('id', id);
    },
    addDepositTransaction: async (tx: DepositTransaction) => {
        await supabase.from('deposit_transactions').insert([tx]);
    },
    deleteDepositTransaction: async (id: string) => {
        await supabase.from('deposit_transactions').delete().eq('id', id);
    },

    // --- TRANSACTIONS ---
    getTransactions: async () => {
        const [customerTransactions, supplierTransactions, payrollTransactions, depositTransactions] = await Promise.all([
            handleResponse(supabase.from('customer_transactions').select('*')),
            handleResponse(supabase.from('supplier_transactions').select('*')),
            handleResponse(supabase.from('payroll_transactions').select('*')),
            handleResponse(supabase.from('deposit_transactions').select('*'))
        ]);
        return { 
            customerTransactions: customerTransactions || [], 
            supplierTransactions: supplierTransactions || [], 
            payrollTransactions: payrollTransactions || [], 
            depositTransactions: depositTransactions || [] 
        };
    },

    // --- INVOICES ---
    getInvoices: async () => {
        const [saleInvoices, purchaseInvoices, inTransitInvoices] = await Promise.all([
            handleResponse(supabase.from('sale_invoices').select('*').order('timestamp', { ascending: false })),
            handleResponse(supabase.from('purchase_invoices').select('*').order('timestamp', { ascending: false })),
            handleResponse(supabase.from('in_transit_invoices').select('*').order('timestamp', { ascending: false }))
        ]);
        return { 
            saleInvoices: saleInvoices || [], 
            purchaseInvoices: purchaseInvoices || [], 
            inTransitInvoices: inTransitInvoices || [] 
        };
    },

    // --- ACTIVITY LOGS ---
    getActivities: async () => {
        return handleResponse(supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(100));
    },
    addActivity: async (log: ActivityLog) => {
        await supabase.from('activity_logs').insert([log]);
    },

    // --- WASTAGE ---
    getWastageRecords: async () => {
        return handleResponse(supabase.from('wastage_records').select('*').order('timestamp', { ascending: false }));
    },
    addWastageRecord: async (record: any) => {
        await supabase.from('wastage_records').insert([record]);
    },

    // --- COMPANIES & PARTNERS ---
    getCompanies: async () => handleResponse(supabase.from('companies').select('*')),
    addCompany: async (company: Company) => {
        await supabase.from('companies').insert([company]);
    },
    updateCompany: async (company: Company) => {
        await supabase.from('companies').update(company).eq('id', company.id);
    },
    deleteCompany: async (id: string) => {
        await supabase.from('companies').delete().eq('id', id);
    },
    getPartners: async () => handleResponse(supabase.from('partners').select('*')),
    addPartner: async (partner: Partner) => {
        await supabase.from('partners').insert([partner]);
    },
    updatePartner: async (partner: Partner) => {
        await supabase.from('partners').update(partner).eq('id', partner.id);
    },
    deletePartner: async (id: string) => {
        await supabase.from('partners').delete().eq('id', id);
    },

    // --- MANAGED COMPANIES ---
    getManagedCompanies: async () => handleResponse(supabase.from('managed_companies').select('*')),
    addManagedCompany: async (company: ManagedCompany) => {
        await handleResponse(supabase.from('managed_companies').insert([company]));
    },
    updateManagedCompany: async (company: ManagedCompany) => {
        await handleResponse(supabase.from('managed_companies').update(company).eq('id', company.id));
    },
    deleteManagedCompany: async (id: string) => {
        await handleResponse(supabase.from('managed_companies').delete().eq('id', id));
    },
    getManagedCompanyLedger: async () => handleResponse(supabase.from('managed_company_ledger').select('*')),
    addManagedCompanyLedgerEntry: async (entry: CompanyLedgerEntry) => {
        await handleResponse(supabase.from('managed_company_ledger').insert([entry]));
    },
    updateManagedCompanyLedgerEntry: async (entry: CompanyLedgerEntry) => {
        await handleResponse(supabase.from('managed_company_ledger').update(entry).eq('id', entry.id));
    },
    deleteManagedCompanyLedgerEntry: async (id: string) => {
        await handleResponse(supabase.from('managed_company_ledger').delete().eq('id', id));
    },
    getManagedCompanyCustomers: async () => handleResponse(supabase.from('managed_company_customers').select('*')),
    addManagedCompanyCustomer: async (customer: ManagedCompanyCustomer) => {
        await handleResponse(supabase.from('managed_company_customers').insert([customer]));
    },
    updateManagedCompanyCustomer: async (customer: ManagedCompanyCustomer) => {
        await handleResponse(supabase.from('managed_company_customers').update(customer).eq('id', customer.id));
    },
    deleteManagedCompanyCustomer: async (id: string) => {
        await handleResponse(supabase.from('managed_company_customers').delete().eq('id', id));
    },
    getCustomerBillingRecords: async () => handleResponse(supabase.from('customer_billing_records').select('*')),
    addCustomerBillingRecord: async (record: CustomerBillingRecord) => {
        await handleResponse(supabase.from('customer_billing_records').insert([record]));
    },
    updateCustomerBillingRecord: async (record: CustomerBillingRecord) => {
        await handleResponse(supabase.from('customer_billing_records').update(record).eq('id', record.id));
    },
    deleteCustomerBillingRecord: async (id: string) => {
        await handleResponse(supabase.from('customer_billing_records').delete().eq('id', id));
    },
    getManagedCompanyInvoices: async () => handleResponse(supabase.from('managed_company_invoices').select('*')),
    addManagedCompanyInvoice: async (invoice: ManagedCompanyInvoice) => {
        await handleResponse(supabase.from('managed_company_invoices').insert([invoice]));
    },
    updateManagedCompanyInvoice: async (invoice: ManagedCompanyInvoice) => {
        await handleResponse(supabase.from('managed_company_invoices').update(invoice).eq('id', invoice.id));
    },
    deleteManagedCompanyInvoice: async (id: string) => {
        await handleResponse(supabase.from('managed_company_invoices').delete().eq('id', id));
    },
    getManagedCompanyProductionLogs: async () => handleResponse(supabase.from('managed_company_production_logs').select('*')),
    addManagedCompanyProductionLog: async (log: ManagedCompanyProductionLog) => {
        await handleResponse(supabase.from('managed_company_production_logs').insert([log]));
    },
    updateManagedCompanyProductionLog: async (log: ManagedCompanyProductionLog) => {
        await handleResponse(supabase.from('managed_company_production_logs').update(log).eq('id', log.id));
    },
    deleteManagedCompanyProductionLog: async (id: string) => {
        await handleResponse(supabase.from('managed_company_production_logs').delete().eq('id', id));
    },

    // --- OWNER TRANSACTIONS ---
    getOwnerTransactions: async () => handleResponse(supabase.from('owner_transactions').select('*')),
    addOwnerTransaction: async (tx: OwnerTransaction) => {
        await handleResponse(supabase.from('owner_transactions').insert([tx]));
    },
    updateOwnerTransaction: async (tx: OwnerTransaction) => {
        await handleResponse(supabase.from('owner_transactions').update(tx).eq('id', tx.id));
    },
    deleteOwnerTransaction: async (id: string) => {
        await handleResponse(supabase.from('owner_transactions').delete().eq('id', id));
    },
    getOwnerExpenseCategories: async () => handleResponse(supabase.from('owner_expense_categories').select('*')),
    addOwnerExpenseCategory: async (c: OwnerExpenseCategory) => {
        await handleResponse(supabase.from('owner_expense_categories').insert([c]));
    },
    updateOwnerExpenseCategory: async (c: OwnerExpenseCategory) => {
        await handleResponse(supabase.from('owner_expense_categories').update(c).eq('id', c.id));
    },
    deleteOwnerExpenseCategory: async (id: string) => {
        await handleResponse(supabase.from('owner_expense_categories').delete().eq('id', id));
    },

    // --- SALARY MANAGEMENT ---
    getCompanyEmployees: async () => handleResponse(supabase.from('company_employees').select('*')),
    addCompanyEmployee: async (employee: CompanyEmployee) => {
        await handleResponse(supabase.from('company_employees').insert([employee]));
    },
    updateCompanyEmployee: async (employee: CompanyEmployee) => {
        await handleResponse(supabase.from('company_employees').update(employee).eq('id', employee.id));
    },
    deleteCompanyEmployee: async (id: string) => {
        await handleResponse(supabase.from('company_employees').delete().eq('id', id));
    },
    getSalaryRecords: async () => handleResponse(supabase.from('salary_records').select('*')),
    addSalaryRecord: async (record: SalaryMonthRecord) => {
        await handleResponse(supabase.from('salary_records').insert([record]));
    },
    updateSalaryRecord: async (record: SalaryMonthRecord) => {
        await handleResponse(supabase.from('salary_records').update(record).eq('id', record.id));
    },
    deleteSalaryRecord: async (id: string) => {
        await handleResponse(supabase.from('salary_records').delete().eq('id', id));
    },
    deleteSalaryRecordsByEmployee: async (employeeId: string) => {
        await handleResponse(supabase.from('salary_records').delete().eq('employeeId', employeeId));
    },
    getSalaryPayments: async () => handleResponse(supabase.from('salary_payments').select('*')),
    addSalaryPayment: async (payment: SalaryPayment) => {
        await handleResponse(supabase.from('salary_payments').insert([payment]));
    },
    updateSalaryPayment: async (payment: SalaryPayment) => {
        await handleResponse(supabase.from('salary_payments').update(payment).eq('id', payment.id));
    },
    deleteSalaryPayment: async (id: string) => {
        await handleResponse(supabase.from('salary_payments').delete().eq('id', id));
    },
    deleteSalaryPaymentsByEmployee: async (employeeId: string) => {
        await handleResponse(supabase.from('salary_payments').delete().eq('employeeId', employeeId));
    },

    // --- ORDERS ---
    getOrders: async () => {
        return handleResponse(supabase.from('orders').select('*').order('created_at', { ascending: false }));
    },
    addOrder: async (order: any) => {
        await supabase.from('orders').insert([order]);
    },
    updateOrder: async (order: any) => {
        await supabase.from('orders').update(order).eq('id', order.id);
    },
    deleteOrder: async (id: string) => {
        await supabase.from('orders').delete().eq('id', id);
    },

    // --- LEGAL RECORDS ---
    getLegalRecords: async () => handleResponse(supabase.from('legal_records').select('*').order('created_at', { ascending: false })),
    addLegalRecord: async (record: any) => {
        await supabase.from('legal_records').insert([record]);
    },
    updateLegalRecord: async (record: any) => {
        await supabase.from('legal_records').update(record).eq('id', record.id);
    },
    deleteLegalRecord: async (id: string) => {
        await supabase.from('legal_records').delete().eq('id', id);
    },

    // --- COMPLEX BUSINESS LOGIC (RPC) ---
    createSale: async (p_invoice: any, p_stock_updates: any, p_customer_update: any, p_supplier_update: any) => {
        const { error } = await supabase.rpc('create_sale_rpc', {
            p_invoice,
            p_stock_updates,
            p_customer_update,
            p_supplier_update
        });
        if (error) throw error;
    },
    updateSale: async (p_invoice_id: string, p_new_invoice: any, p_stock_restores: any, p_stock_updates: any, p_customer_updates: any, p_customer_txs: any, p_supplier_updates: any, p_supplier_txs: any) => {
        const { error } = await supabase.rpc('update_sale_rpc', {
            p_invoice_id,
            p_new_invoice,
            p_stock_restores,
            p_stock_updates,
            p_customer_updates,
            p_customer_txs,
            p_supplier_updates,
            p_supplier_txs
        });
        if (error) throw error;
    },
    deleteSale: async (p_invoice_id: string, p_stock_restores: any, p_customer_update: any, p_supplier_update: any) => {
        const { error } = await supabase.rpc('delete_sale_rpc', {
            p_invoice_id,
            p_stock_restores,
            p_customer_update,
            p_supplier_update
        });
        if (error) throw error;
    },
    createSaleReturn: async (p_return_invoice: any, p_stock_restores: any, p_customer_refund: any) => {
        const { error } = await supabase.rpc('create_sale_return_rpc', {
            p_return_invoice,
            p_stock_restores,
            p_customer_refund
        });
        if (error) throw error;
    },
    createPurchase: async (p_invoice: any, p_supplier_update: any, p_new_batches: any) => {
        try {
            const { error } = await supabase.rpc('create_purchase_rpc', {
                p_invoice,
                p_supplier_update,
                p_new_batches
            });
            if (error) {
                console.error("RPC Error (create_purchase_rpc):", error);
                throw error;
            }
        } catch (e) {
            console.error("Supabase createPurchase Error:", e);
            throw e;
        }
    },
    updatePurchase: async (p_invoice_id: string, p_new_invoice: any, p_supplier_update: any) => {
        try {
            const { error } = await supabase.rpc('update_purchase_rpc', {
                p_invoice_id,
                p_new_invoice,
                p_supplier_update
            });
            if (error) {
                console.error("RPC Error (update_purchase_rpc):", error);
                throw error;
            }
        } catch (e) {
            console.error("Supabase updatePurchase Error:", e);
            throw e;
        }
    },
    createPurchaseReturn: async (p_return_invoice: any, p_return_items: any, p_supplier_refund: any) => {
        const { error } = await supabase.rpc('create_purchase_return_rpc', {
            p_return_invoice,
            p_return_items,
            p_supplier_refund
        });
        if (error) throw error;
    },
    createInTransit: async (p_invoice: any) => {
        const { error } = await supabase.from('in_transit_invoices').insert([p_invoice]);
        if (error) throw error;
    },
    updateInTransit: async (p_invoice: any) => {
        const { error } = await supabase.from('in_transit_invoices').update(p_invoice).eq('id', p_invoice.id);
        if (error) throw error;
    },
    deleteInTransit: async (p_id: string) => {
        const { error } = await supabase.from('in_transit_invoices').delete().eq('id', p_id);
        if (error) throw error;
    },
    moveInTransit: async (p_in_transit_id: string, p_purchase_invoice: any, p_supplier_update: any, p_new_batches: any) => {
        const { error } = await supabase.rpc('move_in_transit_rpc', {
            p_in_transit_id,
            p_purchase_invoice,
            p_supplier_update,
            p_new_batches
        });
        if (error) throw error;
    },
    processPayment: async (p_entity_type: string, p_entity_id: string, p_new_balances: any, p_transaction: any, p_extra_fields: any = {}) => {
        const { error } = await supabase.rpc('process_payment_rpc', {
            p_entity_type,
            p_entity_id,
            p_new_balances,
            p_transaction,
            p_extra_fields
        });
        if (error) throw error;
    },
    deleteTransaction: async (p_entity_type: string, p_entity_id: string, p_transaction_id: string, p_new_balances: any) => {
        const { error } = await supabase.rpc('delete_transaction_rpc', {
            p_entity_type,
            p_entity_id,
            p_transaction_id,
            p_new_balances
        });
        if (error) throw error;
    },
    processPayroll: async (p_employee_updates: any, p_payroll_txs: any, p_expense: any) => {
        const { error } = await supabase.rpc('process_payroll_rpc', {
            p_employee_updates,
            p_payroll_txs,
            p_expense
        });
        if (error) throw error;
    },
    registerWastage: async (p_product_id: string, p_updated_batches: any, p_wastage_record: any, p_activity_log: any) => {
        const { error } = await supabase.rpc('register_wastage_rpc', {
            p_product_id,
            p_updated_batches,
            p_wastage_record,
            p_activity_log
        });
        if (error) throw error;
    },
    activateCustomerActivity: async (p_customer_id: string, p_deposit_transaction: any, p_new_balances: any) => {
        const { error } = await supabase.rpc('activate_customer_activity_rpc', {
            p_customer_id,
            p_deposit_transaction,
            p_new_balances
        });
        if (error) throw error;
    },
    updateSaleInvoice: async (p_invoice: any) => {
        const { error } = await supabase.from('sale_invoices').update(p_invoice).eq('id', p_invoice.id);
        if (error) throw error;
    },
    updateSaleInvoiceTransientName: async (p_id: string, p_name: string) => {
        const { error } = await supabase.from('sale_invoices').update({ transientName: p_name }).eq('id', p_id);
        if (error) throw error;
    },

    // --- SYSTEM ---
    clearAllData: async () => {
        const { error } = await supabase.rpc('clear_all_data_rpc');
        if (error) throw error;
    },
    clearAndRestoreData: async (p_state: any) => {
        const { error } = await supabase.rpc('clear_and_restore_data_rpc', { p_state });
        if (error) throw error;
    },
    saveCloudBackup: async (userId: string, appState: any): Promise<boolean> => {
        try {
            const { error } = await supabase.from('backups').upsert({
                userId: userId,
                data: appState,
                updatedAt: new Date().toISOString()
            }, { onConflict: 'userId' });
            return !error;
        } catch (e) {
            return false;
        }
    },
    getCloudBackup: async (userId: string): Promise<any | null> => {
        try {
            const { data, error } = await supabase.from('backups').select('data').eq('userId', userId).maybeSingle();
            if (error || !data) return null;
            return data.data;
        } catch (e) {
            return null;
        }
    }
};
