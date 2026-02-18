import React from 'react';
import { NavLink } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const sampleData = [
    { name: 'Jan', value: 4000 },
    { name: 'Feb', value: 3000 },
    { name: 'Mar', value: 5000 },
    { name: 'Apr', value: 4000 },
    { name: 'May', value: 6000 }
];

const LandingPage = () => {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div style={{ flex: 1 }}>
                    <h1 className="text-4xl font-bold mb-4">Welcome to the BI Prototype</h1>
                    <p className="text-gray-600 mb-6">Explore KPIs, reports and admin tools. Sign in to access your dashboard and generate reports.</p>
                    <div className="flex items-center gap-3">
                        <NavLink to="/login" className="btn-primary">Login</NavLink>
                        <NavLink to="/register" className="btn-secondary">Register</NavLink>
                    </div>
                </div>

                <div style={{ width: 360, height: 220 }} className="bg-white rounded shadow p-3">
                    <h3 className="text-sm font-medium mb-2">Recent Revenue (Preview)</h3>
                    <ResponsiveContainer width="100%" height="80%">
                        <BarChart data={sampleData}>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#2563eb" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
