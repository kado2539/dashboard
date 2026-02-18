import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [msg, setMsg] = useState('');
    const navigate = useNavigate();

    const submit = async (e) => {
        e.preventDefault();
        try {
            const r = await axios.post('http://localhost:5000/api/auth/register', { name, phone, email, password });
            localStorage.setItem('token', r.data.token);
            localStorage.setItem('user', JSON.stringify(r.data.user));
            window.dispatchEvent(new Event('authChanged'));
            navigate('/');
        } catch (err) {
            setMsg(err.response?.data?.message || 'Register failed');
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Register</h1>
            <form onSubmit={submit}>
                <label className="block mb-2">Full name</label>
                <input className="input mb-3 w-full" value={name} onChange={(e) => setName(e.target.value)} />
                <label className="block mb-2">Phone</label>
                <input className="input mb-3 w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <label className="block mb-2">Email</label>
                <input className="input mb-3 w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
                <label className="block mb-2">Password</label>
                <input type="password" className="input mb-3 w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="flex items-center space-x-3">
                    <button className="btn-primary" type="submit">Register</button>
                    <button type="button" className="btn-secondary" onClick={() => navigate('/login')}>Back to Login</button>
                </div>
                {msg && <div className="text-red-600 mt-3">{msg}</div>}
            </form>
        </div>
    );
};

export default RegisterPage;
