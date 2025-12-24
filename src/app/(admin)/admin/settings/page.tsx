'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCathedisSettingsAction, saveCathedisSettingsAction, disconnectCathedisAction, savePickupLocationsAction } from '@/app/actions';
import { ToggleLeft, ToggleRight, Loader2, Save, Trash2, CheckCircle2, XCircle, MapPin } from 'lucide-react';
import styles from '../Admin.module.css';

export default function SettingsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<{ username: string; isConnected: boolean }>({ username: '', isConnected: false });
    const [pickupLocations, setPickupLocations] = useState('');
    const [formUser, setFormUser] = useState('');
    const [formPass, setFormPass] = useState('');

    useEffect(() => {
        async function load() {
            try {
                const data = await getCathedisSettingsAction();
                setSettings({
                    username: data.username,
                    isConnected: data.isConnected
                });
                setFormUser(data.username);
                setPickupLocations(data.pickupLocations || '');
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('username', formUser);
            formData.append('password', formPass);

            const res = await saveCathedisSettingsAction(formData);
            if (res.success) {
                alert('Connected successfully!');
                setSettings({ ...settings, username: formUser, isConnected: true });
                router.refresh();
            } else {
                alert(`Connection failed: ${res.error}`);
            }
        } catch (err) {
            console.error(err);
            alert('An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect? You will not be able to process shipments.')) return;
        setIsSaving(true);
        try {
            await disconnectCathedisAction();
            setSettings({ username: '', isConnected: false });
            setFormUser('');
            setFormPass('');
            router.refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveLocations = async () => {
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('pickupLocations', pickupLocations);
            const res = await savePickupLocationsAction(formData);

            if (res.success) {
                alert('Pickup locations saved!');
                router.refresh();
            } else {
                alert('Failed to save locations.');
            }
        } catch (err) {
            console.error(err);
            alert('Error saving locations');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Settings</h1>
                <p className="text-slate-500">Manage system configurations and integrations.</p>
            </div>

            {/* Cathedis Integration */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                C
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Cathedis Integration</h2>
                                <p className="text-sm text-slate-500">Connect your Cathedis account for automatic shipping.</p>
                            </div>
                        </div>
                        <div>
                            {settings.isConnected ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 size={14} />
                                    Connected
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                    <XCircle size={14} />
                                    Disconnected
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {settings.isConnected ? (
                        <div className="flex flex-col gap-6">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-full border border-emerald-100">
                                        <CheckCircle2 className="text-emerald-500" size={24} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-emerald-900">Active Connection</div>
                                        <div className="text-sm text-emerald-700">Connected as <span className="font-mono font-bold">{settings.username}</span></div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDisconnect}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors flex items-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                    Disconnect
                                </button>
                            </div>

                            <div className="text-sm text-slate-500 italic">
                                To switch accounts, simply disconnect the current account and connect a new one.
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleConnect} className="max-w-md">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Username / Email</label>
                                    <input
                                        type="text"
                                        required
                                        value={formUser}
                                        onChange={e => setFormUser(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Enter your Cathedis username"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={formPass}
                                        onChange={e => setFormPass(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Enter your Cathedis password"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="animate-spin" size={18} />
                                                Connecting...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                Connect to Cathedis
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Pickup Locations */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Pickup Locations</h2>
                            <p className="text-sm text-slate-500">Define your pickup point overrides.</p>
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        <textarea
                            value={pickupLocations}
                            onChange={(e) => setPickupLocations(e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
                            placeholder="Enter locations (one per line). Format: Label - ID &#10;Example: &#10;Rabat Agdal - 1234 &#10;Tanger Socco - 5678"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleSaveLocations}
                                disabled={isSaving}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Save Locations
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
