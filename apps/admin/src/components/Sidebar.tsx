import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', path: '/' },
    { name: 'Users', path: '/users' },
    { name: 'Organizations', path: '/organizations' },
    { name: 'Services', path: '/services' },
    { name: 'Audit Logs', path: '/audit-logs' },
    { name: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex flex-col w-64 bg-white shadow-md">
      <div className="flex items-center justify-center h-16 bg-indigo-600 text-white font-bold text-xl">
        Tessaro Admin
      </div>
      <nav className="flex-1 px-2 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`block px-4 py-2 rounded-md ${
                  location.pathname === item.path
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
