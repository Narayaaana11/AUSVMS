import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiService } from "@/services/apiService";

interface User {
  username: string;
  role: "admin" | "staff" | "guard";
  loggedInAt: string;
  department?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Backend-only: no sample users

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from storage and validate with backend
    const restore = async () => {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("authToken");
      if (storedUser && token) {
        try {
          const userData = JSON.parse(storedUser);
          // Optionally fetch fresh profile
          const profile = await apiService.getUserProfile().catch(() => null);
          const mappedRole = ((): User["role"] => {
            const r = (profile?.role || userData.role) as string;
            if (r === 'admin') return 'admin';
            if (r === 'staff') return 'staff';
            if (r === 'guard') return 'guard';
            if (r === 'security') { // backward compatibility
              const uname = (profile?.username || userData.username || '').toLowerCase();
              return uname.includes('guard') ? 'guard' : 'staff';
            }
            return 'staff';
          })();
          setUser({
            username: profile?.username || userData.username,
            role: mappedRole,
            department: profile?.department || userData.department,
            loggedInAt: userData.loggedInAt || new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error restoring session:", error);
          localStorage.removeItem("user");
          localStorage.removeItem("authToken");
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    restore();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await apiService.login(username, password);
      // Persist token for API usage
      localStorage.setItem("authToken", res.token);
      const mappedRole = ((): User["role"] => {
        const r = res.user.role as string;
        if (r === 'admin') return 'admin';
        if (r === 'staff') return 'staff';
        if (r === 'guard') return 'guard';
        if (r === 'security') { // backward compatibility
          const uname = (res.user.username || '').toLowerCase();
          return uname.includes('guard') ? 'guard' : 'staff';
        }
        return 'staff';
      })();
      const userData: User = {
        username: res.user.username,
        role: mappedRole,
        department: res.user.department,
        loggedInAt: new Date().toISOString()
      };
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = () => {
    // Clear state first
    setUser(null);
    // Then clear storage
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
