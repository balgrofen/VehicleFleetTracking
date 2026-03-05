"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

// Létrehozzuk a Context-et
const AuthContext = createContext<{ user: User | null; loading: boolean; logout: () => void }>({
  user: null,
  loading: true,
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ez a figyelő szól, ha változik a belépési állapot
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe(); // Takarítás, ha bezárjuk az appot
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Egyedi hook, hogy bárhol könnyen elérd: const { user } = useAuth();
export const useAuth = () => useContext(AuthContext);