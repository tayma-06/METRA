import React, { useContext, useState, useEffect } from 'react';
// 1. Import db from our firebase config
import { auth, db } from '../firebase';
import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    updateProfile,
    // --- I've added the two missing functions here ---
    signInWithEmailAndPassword,
    signOut
} from "firebase/auth";
// 2. Import Firestore doc/setDoc functions
import { doc, setDoc } from "firebase/firestore";

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

    // --- 3. Update the signup function ---
    async function signup(email, password, displayName, role) {
        // 1. Create the user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Update their Auth profile (this just stores displayName)
        await updateProfile(user, {
            displayName: displayName
        });

        // 3. --- CREATE USER DOCUMENT IN FIRESTORE ---
        // This is the new, better way to store profile data
        const userRef = doc(db, "users", user.uid); // Create a reference
        await setDoc(userRef, {
            uid: user.uid,
            email: email,
            displayName: displayName,
            role: role,
            createdAt: new Date()
        });
        // --- End Firestore Update ---

        // 4. Manually set currentUser to include new profile data
        setCurrentUser({
            ...user,
            displayName: displayName
        });

        return userCredential;
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