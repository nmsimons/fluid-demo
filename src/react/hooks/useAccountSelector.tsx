import { useState, useCallback } from "react";
import { AccountInfo } from "@azure/msal-browser";

interface UseAccountSelectorReturn {
	isOpen: boolean;
	accounts: AccountInfo[];
	showAccountSelector: (accounts: AccountInfo[]) => Promise<AccountInfo | null>;
	hideAccountSelector: () => void;
	selectAccount: (account: AccountInfo) => void;
	selectedAccount: AccountInfo | null;
}

export function useAccountSelector(): UseAccountSelectorReturn {
	const [isOpen, setIsOpen] = useState(false);
	const [accounts, setAccounts] = useState<AccountInfo[]>([]);
	const [selectedAccount, setSelectedAccount] = useState<AccountInfo | null>(null);
	const [resolvePromise, setResolvePromise] = useState<
		((account: AccountInfo | null) => void) | null
	>(null);

	const showAccountSelector = useCallback(
		(accountList: AccountInfo[]): Promise<AccountInfo | null> => {
			return new Promise((resolve) => {
				setAccounts(accountList);
				setIsOpen(true);
				setResolvePromise(() => resolve);
			});
		},
		[]
	);

	const hideAccountSelector = useCallback(() => {
		setIsOpen(false);
		setAccounts([]);
		if (resolvePromise) {
			resolvePromise(null);
			setResolvePromise(null);
		}
	}, [resolvePromise]);

	const selectAccount = useCallback(
		(account: AccountInfo) => {
			setSelectedAccount(account);
			setIsOpen(false);
			setAccounts([]);
			if (resolvePromise) {
				resolvePromise(account);
				setResolvePromise(null);
			}
		},
		[resolvePromise]
	);

	return {
		isOpen,
		accounts,
		showAccountSelector,
		hideAccountSelector,
		selectAccount,
		selectedAccount,
	};
}
