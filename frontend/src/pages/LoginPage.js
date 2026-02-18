import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [msg, setMsg] = useState('');
    const navigate = useNavigate();

    const submit = async (e) => {
        e.preventDefault();
        try {
            const r = await axios.post('http://localhost:5000/api/auth/login', { email, password });
            localStorage.setItem('token', r.data.token);
            localStorage.setItem('user', JSON.stringify(r.data.user));
            window.dispatchEvent(new Event('authChanged'));
            navigate('/');
        } catch (err) {
            setMsg(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div>
            <div className="p-6 max-w-md mx-auto">
                <h1 className="text-2xl font-bold mb-4">Login</h1>
                <form onSubmit={submit}>
                    <label className="block mb-2">Email</label>
                    <input className="input mb-3 w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <label className="block mb-2">Password</label>
                    <input type="password" className="input mb-3 w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <div className="flex items-center space-x-3">
                        <button className="btn-primary" type="submit">Login</button>
                        <button type="button" className="btn-secondary" onClick={() => navigate('/register')}>Register</button>
                    </div>
                    {msg && <div className="text-red-600 mt-3">{msg}</div>}
                </form>
            </div>
            <div className="max-w-md mx-auto mt-6 p-4 bg-white rounded shadow">
                <h4 className="text-sm font-medium mb-2">Quick preview</h4>
                <div style={{ width: '100%', height: 120 }}>
                    <ResponsiveContainer>
                        <BarChart data={[{ name: 'W1', value: 1200 }, { name: 'W2', value: 1500 }, { name: 'W3', value: 900 }, { name: 'W4', value: 1700 }]}>
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

export default LoginPage;
