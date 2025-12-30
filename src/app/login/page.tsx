
'use client'

import { useState, Suspense } from 'react'
import { Eye, EyeOff, Loader2, Lock, Mail, User, ArrowRight, ArrowLeft } from 'lucide-react'
import { login, signup } from '../auth/actions'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function LoginContent() {
    const [isLogin, setIsLogin] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const searchParams = useSearchParams()
    const priceId = searchParams.get('priceId')
    const view = searchParams.get('view')

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)

        const action = isLogin ? login : signup

        // We assume the action handles redirect if successful
        const result = await action(formData)

        if (result?.error) {
            setError(result.error)
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row">
            {/* Left: Branding & Visual */}
            <div className="hidden md:flex flex-col justify-between w-1/2 bg-slate-50 p-12 border-r border-slate-200 lg:p-20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -ml-20 -mb-20" />

                <div className="relative z-10">
                    <Link href="/" className="inline-flex items-center gap-2 font-black text-2xl tracking-tighter text-slate-900 mb-2">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">S</div> Social Sight
                    </Link>
                    <p className="text-slate-500 font-medium ml-10">Marketing Intelligence Platform</p>
                </div>

                <div className="relative z-10 space-y-8">
                    <blockquote className="text-3xl font-bold text-slate-900 leading-tight">
                        "Stop guessing locally. Start optimizing specifically. The only tool that guarantees your links convert."
                    </blockquote>
                    <div className="flex items-center gap-4">
                        <img
                            src="/profilepic.jpeg"
                            alt="Ryan Tetro"
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm ring-4 ring-blue-500/5 transition-transform hover:scale-110"
                        />
                        <div>
                            <div className="font-bold text-slate-900">Ryan Tetro</div>
                            <div className="text-slate-500 text-sm font-medium">Founder, Social Sight</div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    © 2025 Social Sight Inc.
                </div>
            </div>

            {/* Right: Form */}
            <div className="w-full md:w-1/2 flex items-center justify-center px-8 pb-8 pt-24 md:p-12 lg:p-24 relative">
                {/* Mobile Back Button */}
                <div className="absolute top-6 left-6 md:hidden z-20">
                    <Link href="/" className="group flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full text-slate-600 font-bold text-xs uppercase tracking-wider shadow-sm hover:bg-white hover:text-blue-600 hover:border-blue-100 hover:shadow-md hover:scale-105 transition-all">
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back
                    </Link>
                </div>

                <div className="w-full max-w-md space-y-10">
                    <div className="text-center md:text-left space-y-2">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                            {isLogin ? 'Welcome back' : 'Start your growth'}
                        </h1>
                        <p className="text-slate-500 font-medium text-lg">
                            {isLogin ? 'Enter your credentials to access your dashboard.' : 'Create an account to track real analytics.'}
                        </p>
                    </div>

                    <form action={handleSubmit} className="space-y-6">
                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                                    <input
                                        name="full_name"
                                        type="text"
                                        required
                                        placeholder="Your Name"
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="name@company.com"
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    minLength={6}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100">
                                ⚠️ {error}
                            </div>
                        )}

                        {/* Hidden Input for Price ID & View */}
                        {priceId && <input type="hidden" name="priceId" value={priceId} />}
                        {view && <input type="hidden" name="view" value={view} />}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError(null);
                            }}
                            className="text-slate-500 font-bold hover:text-blue-600 transition-colors"
                        >
                            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}>
            <LoginContent />
        </Suspense>
    )
}
