import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();
    const accessToken = localStorage.getItem('access_token');

    useEffect(() => {
        if (!accessToken) {
            navigate('/login');
        }
    }, [accessToken, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        navigate('/login');
    };

    if (!accessToken) return null;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Navigation Bar */}
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                                D
                            </div>
                            <span className="text-xl font-bold text-gray-900">Dashboard</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h1>
                        <p className="text-gray-600 mb-8">You have successfully authenticated and are now logged in.</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Stat Card 1 */}
                            <div className="p-6 bg-indigo-50 rounded-xl border border-indigo-100">
                                <div className="text-indigo-600 text-sm font-bold uppercase tracking-wider mb-2">Status</div>
                                <div className="text-2xl font-bold text-indigo-900">Authenticated</div>
                            </div>

                            {/* Stat Card 2 */}
                            <div className="p-6 bg-green-50 rounded-xl border border-green-100">
                                <div className="text-green-600 text-sm font-bold uppercase tracking-wider mb-2">Token Mode</div>
                                <div className="text-2xl font-bold text-green-900">Bearer JWT</div>
                            </div>

                            {/* Stat Card 3 */}
                            <div className="p-6 bg-purple-50 rounded-xl border border-purple-100">
                                <div className="text-purple-600 text-sm font-bold uppercase tracking-wider mb-2">Access Level</div>
                                <div className="text-2xl font-bold text-purple-900">User</div>
                            </div>
                        </div>

                        <div className="mt-10 p-6 bg-slate-900 rounded-xl">
                            <h3 className="text-white font-semibold mb-4">Auth Details (Local Storage)</h3>
                            <div className="space-y-3">
                                <div className="flex flex-col">
                                    <span className="text-slate-400 text-xs">Access Token</span>
                                    <div className="bg-slate-800 p-2 rounded text-indigo-300 text-xs font-mono break-all mt-1">
                                        {accessToken.substring(0, 50)}...
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;