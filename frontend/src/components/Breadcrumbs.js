import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Breadcrumbs = () => {
    const location = useLocation();
    const parts = location.pathname.split('/').filter(Boolean);

    return (
        <nav className="breadcrumb p-2 text-sm text-gray-600">
            <Link to="/" className="text-blue-600">Home</Link>
            {parts.map((part, idx) => {
                const to = '/' + parts.slice(0, idx + 1).join('/');
                const label = part.charAt(0).toUpperCase() + part.slice(1);
                return (
                    <span key={to}>
                        <span className="mx-2">/</span>
                        <Link to={to} className="text-blue-600">{label}</Link>
                    </span>
                );
            })}
        </nav>
    );
};

export default Breadcrumbs;
