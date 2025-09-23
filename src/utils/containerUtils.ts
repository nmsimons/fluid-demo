/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Utility functions for handling container ID from URL parameters
 */

/**
 * Gets the container ID from the URL search parameters.
 * If no container ID is found in the URL, returns an empty string.
 *
 * @returns The container ID from the URL parameter "id", or empty string if not found
 */
export function getContainerIdFromUrl(): string {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get("id") ?? "";
}

/**
 * Updates the URL with the provided container ID.
 * This function modifies the browser's URL without causing a page reload.
 *
 * @param containerId - The container ID to set in the URL
 */
export function updateUrlWithContainerId(containerId: string): void {
	const newUrl = new URL(window.location.href);
	newUrl.searchParams.set("id", containerId);
	window.history.replaceState({}, "", newUrl.toString());
}

/**
 * Gets the container ID from URL, and if empty, can optionally generate a new one.
 * This is useful for scenarios where you need a container ID but want to handle
 * the empty case gracefully.
 *
 * @param generateIfEmpty - If true, generates a new UUID when container ID is empty
 * @returns The container ID from URL, or a new UUID if empty and generateIfEmpty is true
 */
export function getOrGenerateContainerId(generateIfEmpty: boolean = false): string {
	const containerId = getContainerIdFromUrl();

	if (containerId === "" && generateIfEmpty) {
		return crypto.randomUUID();
	}

	return containerId;
}

/**
 * Checks if the current URL has a container ID parameter.
 *
 * @returns true if the URL contains a non-empty container ID parameter, false otherwise
 */
export function hasContainerIdInUrl(): boolean {
	const containerId = getContainerIdFromUrl();
	return containerId !== "";
}
