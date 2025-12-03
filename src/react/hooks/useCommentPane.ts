/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * useCommentPane Hook
 *
 * Manages state and actions related to the comment pane sidebar.
 */

import { useState, useRef, useCallback } from "react";
import type { CommentPaneRef } from "../components/panels/CommentPane.js";

/**
 * State for the comment pane.
 */
export interface CommentPaneState {
	/** Whether the comment pane is hidden */
	commentPaneHidden: boolean;
}

/**
 * Actions for the comment pane.
 */
export interface CommentPaneActions {
	/** Set comment pane visibility */
	setCommentPaneHidden: (hidden: boolean) => void;
	/** Open the comment pane and focus the input for a specific item */
	openCommentPaneAndFocus: (itemId: string) => void;
}

/**
 * Return type for the useCommentPane hook.
 */
export interface UseCommentPaneReturn {
	state: CommentPaneState;
	actions: CommentPaneActions;
	/** Ref to attach to the CommentPane component */
	commentPaneRef: React.RefObject<CommentPaneRef>;
	/** Setter for the selected item ID (passed from selection state) */
	setSelectedItemId: (id: string) => void;
}

/**
 * Custom hook that manages comment pane state and actions.
 *
 * Features:
 * - Manages comment pane visibility
 * - Provides action to open pane and focus input for a specific item
 * - Maintains ref for imperative access to CommentPane methods
 *
 * @param setSelectedItemId - Function to set the currently selected item ID
 * @returns Object containing state, actions, and ref
 */
export function useCommentPane(setSelectedItemId: (id: string) => void): UseCommentPaneReturn {
	const [commentPaneHidden, setCommentPaneHidden] = useState(true);
	const commentPaneRef = useRef<CommentPaneRef>(null!);

	// Function to open comment pane and focus input
	const openCommentPaneAndFocus = useCallback(
		(itemId: string) => {
			setSelectedItemId(itemId);
			setCommentPaneHidden(false);
			// Use setTimeout to ensure the pane is rendered before focusing
			setTimeout(() => {
				commentPaneRef.current?.focusInput();
			}, 0);
		},
		[setSelectedItemId]
	);

	return {
		state: {
			commentPaneHidden,
		},
		actions: {
			setCommentPaneHidden,
			openCommentPaneAndFocus,
		},
		commentPaneRef,
		setSelectedItemId,
	};
}
