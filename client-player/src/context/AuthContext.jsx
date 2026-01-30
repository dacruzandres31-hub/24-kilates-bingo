import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [gamificationData, setGamificationData] = useState(null);

    // Safety check for parsing user data
    const parseUserData = (data) => {
        try {
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error parsing user data:', e);
            localStorage.removeItem('playerUser');
            return null;
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('playerToken');
        const savedUser = localStorage.getItem('playerUser');

        if (token && savedUser) {
            const parsedUser = parseUserData(savedUser);
            if (parsedUser) {
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setUser(parsedUser);
                setIsAuthenticated(true);
            }
        }

        setLoading(false);
    }, []);

    const login = (token, userData, gamification = null) => {
        localStorage.setItem('playerToken', token);
        localStorage.setItem('playerUser', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        setIsAuthenticated(true);
        if (gamification) {
            setGamificationData(gamification);
        }
    };

    const logout = () => {
        localStorage.removeItem('playerToken');
        localStorage.removeItem('playerUser');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setIsAuthenticated(false);
        setGamificationData(null);
    };

    const updateUser = (updatedData) => {
        setUser(prev => {
            const newUser = { ...prev, ...updatedData };
            localStorage.setItem('playerUser', JSON.stringify(newUser));
            return newUser;
        });
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        updateUser,
        gamificationData, // Expose for components that need it immediately after login
        setGamificationData
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
