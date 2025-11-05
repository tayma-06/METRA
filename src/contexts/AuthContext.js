import React, { useContext, useState, useEffect } from 'react';
import { auth } from '../firebase'; // Import from your new firebase.js
import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "firebase/auth";

// 1. Create the Context
const AuthContext = React.createContext();

// 2. Create a custom hook to use the context
export function useAuth() {
    return useContext(AuthContext);
}

// 3. Create the AuthProvider component
export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true); // Loading state

    // --- Auth Functions ---

    function signup(email, password) {
        // This returns a promise
        return createUserWithEmailAndPassword(auth, email, password);
    }

    function login(email, password) {
        // This returns a promise
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        return signOut(auth);
    }

    // --- Monitor Auth State ---
    useEffect(() => {
        // onAuthStateChanged returns an unsubscribe function
        const unsubscribe = onAuthStateChanged(auth, user => {
            setCurrentUser(user); // Set user or null
            setLoading(false); // We're done loading
        });

        // Cleanup on unmount
        return unsubscribe;
    }, []); // Empty array means this runs once on mount

    // 4. Pass down the values
    const value = {
        currentUser,
        loading,
        signup,
        login,
        logout
    };

    // 5. Render children only when *not* loading
    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}