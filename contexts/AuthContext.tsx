import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { initGoogleClient, signInWithGoogle, fetchSheetData, getSpreadsheetId } from '../services/googleSheetsClient';

declare const gapi: any;
declare const google: any;



interface AuthContextType {
    user: User | null;
    loading: boolean;
    availableProfiles: User[]; // Added
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    bypassAuth: () => Promise<void>;
    selectProfile: (user: User) => void; // Added
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    availableProfiles: [],
    signIn: async () => { },
    signOut: async () => { },
    bypassAuth: async () => { },
    selectProfile: (user: User) => { }
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [availableProfiles, setAvailableProfiles] = useState<User[]>([]);

    useEffect(() => {
        // ... existing effect ...
        const safetyTimeout = setTimeout(() => {
            setLoading(false);
        }, 4000);

        initGoogleClient().then(() => {
            clearTimeout(safetyTimeout);
            setLoading(false);
        }).catch(err => {
            clearTimeout(safetyTimeout);
            console.error("Failed to init Google Client (AuthContext)", err);
            setLoading(false);
        });
    }, []);

    const signIn = async () => {
        try {
            setLoading(true);
            const accessToken = await signInWithGoogle();

            // 1. Fetch Google Info
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!userInfoRes.ok) throw new Error("Falha ao buscar dados do perfil do usuário.");
            const googleProfile = await userInfoRes.json(); // we still get the google email for audit if needed

            // 2. FETCH USERS FROM SHEET
            let usersFromSheet: User[] = [];
            try {
                const sheetData = await fetchSheetData('users!A:C');
                if (sheetData && sheetData.length > 0) {
                    usersFromSheet = sheetData.map((row: any) => ({
                        email: row.email || googleProfile.email, // fallback to google email if empty
                        name: row.name || 'Sem Nome',
                        role: row.role || 'user'
                    }));
                }
            } catch (err) {
                console.warn("Could not fetch users from sheet, using defaults/fallback logic.", err);
            }

            // 3. FORCE SPECIFIC USERS (Requested: Abner, Elvis, Vinicius)
            // Ignora a planilha para esta seleção, conforme pedido "Deixe somente..."
            const forcedUsers: User[] = [
                {
                    name: 'Abner',
                    email: 'abner@freshcrm.com',
                    role: 'admin',
                    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
                },
                {
                    name: 'Elvis',
                    email: 'elvis@freshcrm.com',
                    role: 'user',
                    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2.25&w=256&h=256&q=80'
                },
                {
                    name: 'Vinícius',
                    email: 'vinicius@freshcrm.com',
                    role: 'user',
                    avatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
                }
            ];

            setAvailableProfiles(forcedUsers);
            // DO NOT setUser yet. Wait for selection.

        } catch (error: any) {
            console.error("Login Error:", error);
            alert(typeof error === 'string' ? error : error.message);
            await signOut();
        } finally {
            setLoading(false);
        }
    };

    const selectProfile = (profile: User) => {
        setUser(profile);
        localStorage.setItem('freshcrm_user', JSON.stringify(profile));
    };

    const bypassAuth = async () => {
        const defaultUsers = [
            { name: 'Abner', email: 'abner@fastcrm.com', role: 'admin' },
            { name: 'Elvis', email: 'elvis@fastcrm.com', role: 'user' },
            { name: 'Vinícius', email: 'vinicius@fastcrm.com', role: 'user' }
        ];
        setAvailableProfiles(defaultUsers);
    };

    const signOut = async () => {
        setUser(null);
        setAvailableProfiles([]); // Clear profiles on logout
        localStorage.removeItem('freshcrm_user');
        if (typeof google !== 'undefined' && google.accounts.oauth2 && gapi.client) {
            const token = gapi.client.getToken();
            if (token) {
                google.accounts.oauth2.revoke(token.access_token, () => { });
                gapi.client.setToken(null);
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, availableProfiles, signIn, signOut, bypassAuth, selectProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);