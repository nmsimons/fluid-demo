/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * useAiBranchState Hook
 *
 * Manages state related to the AI pane and branch view switching.
 * This includes the current view (main tree or AI branch), AI pane visibility,
 * and the branch message banner.
 */

import { useState, useEffect, useCallback } from "react";
import { TreeView } from "fluid-framework";
import { App } from "../../schema/appSchema.js";

/**
 * State for AI branch management.
 */
export interface AiBranchState {
	/** The current tree view being rendered (may be main tree or AI branch) */
	view: TreeView<typeof App>;
	/** Whether the AI pane is hidden */
	aiPaneHidden: boolean;
	/** Whether to show the AI branch message banner */
	showAiBranchMessage: boolean;
	/** Whether currently viewing a branch (view !== tree) */
	isBranch: boolean;
}

/**
 * Actions for modifying AI branch state.
 */
export interface AiBranchActions {
	/** Set the current view to render */
	setView: (view: TreeView<typeof App>) => void;
	/** Set AI pane visibility */
	setAiPaneHidden: (hidden: boolean) => void;
	/** Set branch message visibility */
	setShowAiBranchMessage: (show: boolean) => void;
}

/**
 * Return type for the useAiBranchState hook.
 */
export interface UseAiBranchStateReturn {
	state: AiBranchState;
	actions: AiBranchActions;
}

/**
 * Custom hook that manages AI pane and branch view state.
 *
 * Features:
 * - Tracks the current view (main tree or AI-generated branch)
 * - Manages AI pane visibility
 * - Automatically shows/hides branch message based on AI pane state
 * - Provides computed isBranch property for context providers
 *
 * @param tree - The main tree view (used to determine if viewing a branch)
 * @returns Object containing state and actions
 */
export function useAiBranchState(tree: TreeView<typeof App>): UseAiBranchStateReturn {
	const [view, setView] = useState<TreeView<typeof App>>(tree);
	const [aiPaneHidden, setAiPaneHidden] = useState(true);
	const [showAiBranchMessage, setShowAiBranchMessage] = useState(false);

	// Monitor AI pane and show/hide branch message
	useEffect(() => {
		if (!aiPaneHidden) {
			setShowAiBranchMessage(true);
		} else {
			setShowAiBranchMessage(false);
		}
	}, [aiPaneHidden]);

	// Computed property: are we viewing a branch?
	const isBranch = view !== tree;

	// Wrap setView to accept the correct type
	const handleSetView = useCallback((newView: TreeView<typeof App>) => {
		setView(newView);
	}, []);

	return {
		state: {
			view,
			aiPaneHidden,
			showAiBranchMessage,
			isBranch,
		},
		actions: {
			setView: handleSetView,
			setAiPaneHidden,
			setShowAiBranchMessage,
		},
	};
}
