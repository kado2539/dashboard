import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

const ProtectedRoute = ({ children, adminOnly }) => {
    const [ok, setOk] = useState(null);

    useEffect(() => {
        const check = async () => {
            const token = localStorage.getItem('token');
            if (!token) return setOk(false);
            try {
                const r = await axios.get('http://localhost:5000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                if (adminOnly) {
                    const isAdmin = r.data?.user?.isAdmin;
                    if (!isAdmin) return setOk(false);
                }
                setOk(true);
            } catch (err) {
                setOk(false);
            }
        };
        check();
    }, [adminOnly]);

    if (ok === null) return <div>Checking auth...</div>;
    if (!ok) return <Navigate to="/login" replace />;
    return children;
};

export default ProtectedRoute;
