import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { KeyIcon, UserGroupIcon, WarningIcon, CheckIcon } from '../components/icons';

const Login: React.FC = () => {
    const { login, isShopActive } = useAppContext();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // If shop becomes active, clear errors
    useEffect(() => {
        if (isShopActive) setError('');
    }, [isShopActive]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        
        setError('');
        setMessage('');
        setIsSubmitting(true);
        
        try {
            const result = await login(identifier, password);
            if (!result.success) {
                setError(result.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white overflow-hidden modal-animate">
                {/* Header Section */}
                <div className="pt-10 pb-6 px-8 text-center bg-gradient-to-b from-blue-50/50 to-transparent">
                    <h1 className="text-4xl font-black text-blue-600 mb-1 tracking-tighter">Vendura</h1>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className={`w-2 h-2 rounded-full ${isShopActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isShopActive ? 'text-green-600' : 'text-red-600'}`}>
                            وضعیت فروشگاه: {isShopActive ? 'فعال و آماده کار' : 'غیرفعال (نیاز به ورود مدیر)'}
                        </span>
                    </div>
                </div>

                <div className="px-8 pb-10">
                    <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
                        {/* Dummy fields to trick browser autocomplete */}
                        <input type="text" name="fake_username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                        <input type="password" name="fake_password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 mr-1">
                                    نام کاربری
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    autoComplete="off"
                                    className="w-full px-4 py-3.5 bg-slate-100 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-800 font-medium"
                                    placeholder="نام کاربری"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 mr-1">رمز عبور</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="new-password"
                                        className="w-full px-4 py-3.5 bg-slate-100 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-800 font-medium"
                                        placeholder="••••••••"
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-xl">
                                <p className="text-xs text-red-700 font-bold leading-relaxed">{error}</p>
                            </div>
                        )}
                        
                        {message && (
                            <div className="bg-green-50 border-r-4 border-green-500 p-4 rounded-xl">
                                <p className="text-sm text-green-700 font-bold">{message}</p>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className={`w-full py-4 px-6 rounded-2xl text-white font-black text-lg shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3 ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isSubmitting ? (
                                <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                'ورود به سیستم'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;