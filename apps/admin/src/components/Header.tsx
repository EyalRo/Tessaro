import React from 'react';

const Header = () => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <button className="flex items-center focus:outline-none">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
              AD
            </div>
            <span className="ml-2 text-gray-700">Admin User</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
