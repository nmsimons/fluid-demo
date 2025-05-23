import {
	CommitKind,
	CommitMetadata,
	Listenable,
	Revertible,
	RevertibleFactory,
	TreeViewEvents,
} from "fluid-framework";

/**
 * Create undo and redo stacks for a tree view. The stacks are populated with revertible objects.
 * You can manage the stacks by calling `undo` and `redo`. The redo stack is cleared when a new commit is made.
 * The dispose function should be called when the stacks are no longer needed.
 */
export function createUndoRedoStacks(events: Listenable<TreeViewEvents>): undoRedo {
	// Create arrays to store revertible objects
	const undoStack: Revertible[] = [];
	const redoStack: Revertible[] = [];

	// Manage the stacks when a new commit is made
	function onNewCommit(commit: CommitMetadata, getRevertible?: RevertibleFactory): void {
		if (getRevertible === undefined) {
			return;
		}
		const revertible = getRevertible();
		if (commit.kind === CommitKind.Undo) {
			redoStack.push(revertible);
		} else {
			if (commit.kind === CommitKind.Default) {
				// clear redo stack
				for (const redo of redoStack) {
					redo.dispose();
				}
				redoStack.length = 0;
			}
			undoStack.push(revertible);
		}
	}

	// Subscribe to the commitApplied event
	const unsubscribeFromCommitApplied = events.on("commitApplied", onNewCommit);

	// Dispose function to clean up the stacks
	const dispose = () => {
		unsubscribeFromCommitApplied();
		for (const revertible of undoStack) {
			revertible.dispose();
		}
		for (const revertible of redoStack) {
			revertible.dispose();
		}
		redoStack.length = 0;
		undoStack.length = 0;
	};

	// Function to revert from a stack
	function revertFromStack(stack: Revertible[]): void {
		const revertible = stack.pop();
		if (revertible !== undefined) {
			revertible.revert();
		}
	}

	function undo(): void {
		revertFromStack(undoStack);
	}

	function redo(): void {
		revertFromStack(redoStack);
	}

	return {
		undo,
		redo,
		dispose,
		canUndo: () => undoStack.length > 0,
		canRedo: () => redoStack.length > 0,
	};
}

export type undoRedo = {
	undo: () => void;
	redo: () => void;
	dispose: () => void;
	canUndo: () => boolean;
	canRedo: () => boolean;
};
