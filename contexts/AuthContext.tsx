import React, { createContext, useContext, useState, useEffect } from 'react';
import { initGoogleClient, signInWithGoogle, fetchSheetData, getSpreadsheetId } from '../services/googleSheetsClient';

declare const gapi: any;
declare const google: any;

interface User {
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    loading: true, 
    signIn: async () => {}, 
    signOut: async () => {} 
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // NOTA: Removemos a verificação do localStorage aqui.
    // O Token do Google (GAPI) é perdido no refresh. Se restaurarmos o usuário do localStorage,
    // a aplicação achará que está logada, mas todas as chamadas de API falharão com 401 Unauthorized.
    // É mais seguro forçar o login novamente para garantir um token de acesso válido.
    
    // Initialize Google Scripts with safety timeout in component
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
        
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!userInfoRes.ok) {
            throw new Error("Falha ao buscar dados do perfil do usuário.");
        }

        const googleProfile = await userInfoRes.json();
        
        // 3. INTERNAL AUTH: Check if this email exists in 'users' tab of the Sheet
        let usersSheet;
        try {
            usersSheet = await fetchSheetData('users!A:C'); 
        } catch (sheetError: any) {
            console.error("Sheet Fetch Error:", sheetError);
            const currentId = getSpreadsheetId();
            
            if (sheetError?.result?.error?.code === 404) {
                 let extraHint = "";
                 if (currentId && currentId.length !== 44) {
                     extraHint = `\n\n⚠️ ALERTA: O ID informado tem ${currentId.length} caracteres. Um ID padrão do Google Sheets possui 44 caracteres.`;
                 }

                 throw new Error(`Planilha não encontrada (404). \n\nO sistema tentou acessar o ID: "${currentId}"${extraHint} \n\nVerifique se copiou corretamente o código entre "/d/" e "/edit" na URL da planilha e reinicie o servidor.`);
            }
            
            if (sheetError?.result?.error?.message?.includes("Unable to parse range")) {
                 throw new Error(`A aba 'users' não existe na planilha (ID: ${currentId}). Crie uma aba chamada 'users'.`);
            }

            throw new Error(`Erro ao ler planilha: ${sheetError?.result?.error?.message || sheetError.message}`);
        }
        
        const authorizedUser = usersSheet.find((u: any) => u.email?.toLowerCase() === googleProfile.email.toLowerCase());

        if (authorizedUser) {
            const appUser: User = {
                email: googleProfile.email,
                name: authorizedUser.name || googleProfile.name,
                role: authorizedUser.role || 'user'
            };
            setUser(appUser);
            // We store it just for reference, but we rely on memory state for Auth
            localStorage.setItem('freshcrm_user', JSON.stringify(appUser));
        } else {
            throw new Error(`O e-mail ${googleProfile.email} não está autorizado na aba 'users'.`);
        }

    } catch (error: any) {
        console.error("Login Error Full Object:", error);
        
        let msg = "Erro desconhecido ao fazer login";
        
        if (typeof error === 'string') {
            msg = error;
        } else if (error?.message) {
            msg = error.message;
        }

        alert(msg);
        await signOut();
    } finally {
        setLoading(false);
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('freshcrm_user');
    if (typeof google !== 'undefined' && google.accounts.oauth2 && gapi.client) {
        const token = gapi.client.getToken();
        if (token) {
            google.accounts.oauth2.revoke(token.access_token, () => {});
            gapi.client.setToken(null);
        }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);