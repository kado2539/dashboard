import React, { useState } from 'react';
import axios from 'axios';

const ReportsPanel = () => {
    const [generating, setGenerating] = useState(false);
    const [generatedPath, setGeneratedPath] = useState('');
    const [toast, setToast] = useState('');

    const generate = async () => {
        setGenerating(true);
        try {
            const r = await axios.post('http://localhost:5000/api/report/generate');
            if (r.data && r.data.path) {
                setGeneratedPath(r.data.path);
                setToast('Report generated');
                setTimeout(() => setToast(''), 3000);
            } else {
                setToast('Report generated');
                setTimeout(() => setToast(''), 3000);
            }
        } catch (err) {
            console.error('Generate report error', err);
            setToast('Generate failed');
            setTimeout(() => setToast(''), 3000);
            setGeneratedPath('');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="reports-panel card">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Reports</h3>
                <div>
                    <button onClick={generate} className="btn-primary">{generating ? 'Generating...' : 'Generate Report'}</button>
                </div>
            </div>

            {toast && (
                <div style={{ position: 'fixed', right: 20, bottom: 20, background: '#111827', color: '#fff', padding: '10px 14px', borderRadius: 8 }}>
                    {toast} {generatedPath && (<a href={`http://localhost:5000${generatedPath}`} target="_blank" rel="noreferrer" style={{ color: '#9ae6b4', marginLeft: 8 }}>Download</a>)}
                </div>
            )}
        </div>
    );
};

export default ReportsPanel;
