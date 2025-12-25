'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCathedisSettingsAction, saveCathedisSettingsAction, disconnectCathedisAction, savePickupLocationsAction } from '@/app/actions';
import { ToggleLeft, ToggleRight, Loader2, Save, Trash2, CheckCircle2, XCircle, MapPin } from 'lucide-react';
import styles from './Settings.module.css';

export default function SettingsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<{ username: string; isConnected: boolean }>({ username: '', isConnected: false });

    // Changing from simple string to array of objects
    const [locations, setLocations] = useState<{ name: string; id: string }[]>([]);

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

                // Parse the existing string into array
                if (data.pickupLocations) {
                    const parsed = data.pickupLocations.split('\n')
                        .map(line => {
                            const [name, id] = line.split('-').map(s => s.trim());
                            return { name: name || '', id: id || '' };
                        })
                        .filter(l => l.name || l.id);
                    setLocations(parsed.length > 0 ? parsed : [{ name: '', id: '' }]);
                } else {
                    setLocations([{ name: '', id: '' }]);
                }
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
            // Serialize array back to string
            const serialized = locations
                .filter(l => l.name.trim() && l.id.trim())
                .map(l => `${l.name.trim()} - ${l.id.trim()}`)
                .join('\n');

            const formData = new FormData();
            formData.append('pickupLocations', serialized);
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

    const addLocation = () => {
        setLocations([...locations, { name: '', id: '' }]);
    };

    const removeLocation = (index: number) => {
        const newLocations = [...locations];
        newLocations.splice(index, 1);
        setLocations(newLocations);
    };

    const updateLocation = (index: number, field: 'name' | 'id', value: string) => {
        const newLocations = [...locations];
        newLocations[index][field] = value;
        setLocations(newLocations);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Settings</h1>
                <p className={styles.subtitle}>Manage your seamless integration with Cathedis.</p>
            </div>

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div className={styles.brand}>
                        <div className={`${styles.logo} ${settings.isConnected ? styles.logoConnected : styles.logoDisconnected}`}>
                            C
                        </div>
                        <div>
                            <h2 className={styles.integrationTitle}>Cathedis Integration</h2>
                            <p className={styles.integrationDesc}>Automatic shipping & labeling</p>
                        </div>
                    </div>
                    <div>
                        {settings.isConnected ? (
                            <div className={`${styles.statusBadge} ${styles.statusConnected}`}>
                                <span className={styles.indicator}>
                                    <span className={styles.ping}></span>
                                    <span className={styles.dot}></span>
                                </span>
                                <span>Connected</span>
                            </div>
                        ) : (
                            <div className={`${styles.statusBadge} ${styles.statusDisconnected}`}>
                                Not Connected
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.cardBody}>
                    {settings.isConnected ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className={styles.activeAccountCard}>
                                <div className={styles.accountInfo}>
                                    <div className={styles.checkIcon}>
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <p className={styles.accountLabel}>Active Account</p>
                                        <p className={styles.username}>{settings.username}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDisconnect}
                                    disabled={isSaving}
                                    className={styles.disconnectBtn}
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                    Disconnect
                                </button>
                            </div>

                            <div className={styles.pickupSection}>
                                <div className={styles.sectionHeader}>
                                    <div className={styles.pinIcon}>
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <h3 className={styles.sectionTitle}>Pickup Locations</h3>
                                        <p className={styles.sectionSubtitle}>Manage your custom pickup points.</p>
                                    </div>
                                </div>

                                <div className={styles.locationsList}>
                                    {locations.map((loc, idx) => (
                                        <div key={idx} className={styles.locationRow}>
                                            <div className={styles.locationInputGroup}>
                                                <label className={styles.inputLabel}>Location Name</label>
                                                <input
                                                    type="text"
                                                    value={loc.name}
                                                    onChange={(e) => updateLocation(idx, 'name', e.target.value)}
                                                    className={styles.locationInput}
                                                    placeholder="e.g. Rabat Agdal"
                                                />
                                            </div>
                                            <div className={styles.locationInputGroup}>
                                                <label className={styles.inputLabel}>Location ID</label>
                                                <input
                                                    type="text"
                                                    value={loc.id}
                                                    onChange={(e) => updateLocation(idx, 'id', e.target.value)}
                                                    className={styles.locationInput}
                                                    placeholder="e.g. 1234"
                                                />
                                            </div>
                                            <div style={{ marginTop: 'auto' }}>
                                                <button
                                                    onClick={() => removeLocation(idx)}
                                                    className={`${styles.iconBtn} ${styles.removeBtn}`}
                                                    title="Remove Location"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={addLocation} className={styles.addBtn}>
                                        + Add Another Location
                                    </button>
                                </div>

                                <div className={styles.actions}>
                                    <div></div> {/* Spacer */}
                                    <button
                                        onClick={handleSaveLocations}
                                        disabled={isSaving}
                                        className={styles.saveBtn}
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.loginForm}>
                            <form onSubmit={handleConnect} className={styles.form}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Username</label>
                                    <input
                                        type="text"
                                        required
                                        value={formUser}
                                        onChange={e => setFormUser(e.target.value)}
                                        className={styles.input}
                                        placeholder="Cathedis username"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={formPass}
                                        onChange={e => setFormPass(e.target.value)}
                                        className={styles.input}
                                        placeholder="••••••••••••"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className={styles.connectBtn}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={20} />
                                            Connect Account
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
