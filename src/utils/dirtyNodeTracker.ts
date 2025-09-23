/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { TreeViewAlpha, trackDirtyNodes, ImplicitFieldSchema } from "@fluidframework/tree/alpha";

// Type for the dirty map - using Map instead of WeakMap for iteration support
type DirtyMap = Map<unknown, unknown>;

/**
 * A utility class for tracking and logging dirty nodes in a TreeView.
 * This provides a reusable way to monitor changes and output detailed information
 * about what nodes have been modified during operations.
 */
export class DirtyNodeTracker {
	private dirtyMap: DirtyMap;
	private trackedView: TreeViewAlpha<ImplicitFieldSchema> | undefined;
	private isTracking: boolean = false;

	constructor() {
		this.dirtyMap = new Map();
	}

	/**
	 * Sets up dirty tracking for the provided TreeView.
	 * @param view - The TreeView to track for dirty nodes
	 */
	public setupTracking(view: TreeViewAlpha<ImplicitFieldSchema>): void {
		this.trackedView = view;

		if (view) {
			console.log("Setting up dirty tracking for tree view");
			// Set up dirty tracking on the view
			// Note: We need to cast to any to work around type compatibility issues
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			trackDirtyNodes(view, this.dirtyMap as any);

			this.isTracking = true;
			console.log("Dirty tracking initialized for view:", view);
		}
	}

	/**
	 * Stops tracking and clears the current dirty map.
	 */
	public stopTracking(): void {
		this.isTracking = false;
		this.trackedView = undefined;
		this.dirtyMap.clear();
		console.log("Dirty tracking stopped and cleared");
	}

	/**
	 * Logs detailed information about all currently dirty nodes.
	 * @param prefix - Optional prefix for log messages
	 */
	public logDirtyNodes(prefix: string = ""): void {
		const logPrefix = prefix ? `${prefix} - ` : "";

		console.log(`${logPrefix}=== Current Dirty Nodes ===`);
		console.log(`${logPrefix}Total dirty nodes: ${this.dirtyMap.size}`);

		if (this.dirtyMap.size === 0) {
			console.log(`${logPrefix}No dirty nodes found.`);
		} else {
			console.log(`${logPrefix}Iterating through dirty nodes:`);
			let index = 0;
			for (const [node, status] of this.dirtyMap) {
				console.log(`${logPrefix}  [${index}] Node:`, node);
				console.log(`${logPrefix}      Status:`, status);
				console.log(`${logPrefix}      Node type:`, typeof node);
				console.log(
					`${logPrefix}      Node constructor:`,
					(node as Record<string, unknown>)?.constructor?.name
				);

				// Try to get some identifying information about the node
				try {
					if (node && typeof node === "object") {
						const nodeInfo = JSON.stringify(node, null, 2);
						if (nodeInfo.length < 500) {
							console.log(`${logPrefix}      Node content:`, nodeInfo);
						} else {
							console.log(
								`${logPrefix}      Node content: [Large object - ${nodeInfo.length} chars]`
							);
						}
					}
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : "Unknown error";
					console.log(
						`${logPrefix}      Node content: [Unable to serialize - ${errorMessage}]`
					);
				}
				index++;
			}
		}
		console.log(`${logPrefix}===========================`);
	}

	/**
	 * Gets the current number of dirty nodes.
	 * @returns The count of dirty nodes
	 */
	public getDirtyNodeCount(): number {
		return this.dirtyMap.size;
	}

	/**
	 * Checks if tracking is currently active.
	 * @returns true if tracking is active, false otherwise
	 */
	public isTrackingActive(): boolean {
		return this.isTracking;
	}

	/**
	 * Gets a copy of the current dirty map.
	 * @returns A new Map containing the current dirty nodes
	 */
	public getDirtyNodesSnapshot(): DirtyMap {
		return new Map(this.dirtyMap);
	}

	/**
	 * Clears all dirty nodes from tracking without stopping the tracker.
	 */
	public clearDirtyNodes(): void {
		const previousCount = this.dirtyMap.size;
		this.dirtyMap.clear();
		console.log(`Cleared ${previousCount} dirty nodes from tracker`);
	}
}

/**
 * A higher-level utility class that wraps DirtyNodeTracker for operation-based tracking.
 * This provides methods to check dirty state before and after operations.
 */
export class OperationTracker {
	private tracker: DirtyNodeTracker;

	constructor() {
		this.tracker = new DirtyNodeTracker();
	}

	/**
	 * Sets up tracking for a specific tree view.
	 * @param view - The TreeView to track
	 */
	public setupTracking(view: TreeViewAlpha<ImplicitFieldSchema>): void {
		this.tracker.setupTracking(view);
	}

	/**
	 * Checks and logs dirty state before an operation.
	 * @param operationName - Name of the operation being performed
	 */
	public checkDirtyStateBefore(operationName: string): void {
		console.log(`\n=== BEFORE ${operationName.toUpperCase()} ===`);
		this.tracker.logDirtyNodes("BEFORE");

		if (this.tracker.getDirtyNodeCount() > 0) {
			console.log(
				`WARNING: Found ${this.tracker.getDirtyNodeCount()} dirty nodes before ${operationName}`
			);
		}
	}

	/**
	 * Checks and logs dirty state after an operation.
	 * @param operationName - Name of the operation that was performed
	 */
	public checkDirtyStateAfter(operationName: string): void {
		console.log(`\n=== AFTER ${operationName.toUpperCase()} ===`);
		this.tracker.logDirtyNodes("AFTER");

		if (this.tracker.getDirtyNodeCount() > 0) {
			console.log(
				`INFO: Found ${this.tracker.getDirtyNodeCount()} dirty nodes after ${operationName}`
			);
		} else {
			console.log(`SUCCESS: No dirty nodes found after ${operationName}`);
		}
	}

	/**
	 * Clears all dirty nodes.
	 */
	public clearDirtyNodes(): void {
		this.tracker.clearDirtyNodes();
	}

	/**
	 * Stops tracking.
	 */
	public stopTracking(): void {
		this.tracker.stopTracking();
	}

	/**
	 * Gets the underlying DirtyNodeTracker for advanced operations.
	 * @returns The DirtyNodeTracker instance
	 */
	public getTracker(): DirtyNodeTracker {
		return this.tracker;
	}
}

/**
 * Convenience function to create a new DirtyNodeTracker.
 * @returns A new DirtyNodeTracker instance
 */
export function createDirtyNodeTracker(): DirtyNodeTracker {
	return new DirtyNodeTracker();
}

/**
 * Convenience function to create a new OperationTracker.
 * @returns A new OperationTracker instance
 */
export function createOperationTracker(): OperationTracker {
	return new OperationTracker();
}
