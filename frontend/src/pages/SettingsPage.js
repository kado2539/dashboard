import React from 'react';
import SettingsPanel from '../components/SettingsPanel';

const SettingsPage = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Settings</h1>
            <SettingsPanel />
        </div>
    );
};

export default SettingsPage;
