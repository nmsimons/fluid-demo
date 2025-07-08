import { createContext } from "react";
import { PublicClientApplication } from "@azure/msal-browser";

export interface AuthContextType {
	msalInstance: PublicClientApplication | null;
}

export const AuthContext = createContext<AuthContextType>({
	msalInstance: null,
});
