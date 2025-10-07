/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { test, expect, Page } from "@playwright/test";

async function createShape(page: Page, shape: "circle" | "square" | "triangle" | "star") {
await page.getByTestId("shape-menu-button").click({ force: true });
await page.waitForTimeout(200); // Wait for menu to open
await page.getByTestId(`shape-option-${shape}`).click();
await page.waitForTimeout(300); // Wait for shape creation to complete
}

test.describe("Canvas Operations", () => {
test.beforeEach(async ({ page }) => {
await page.goto("/", { waitUntil: "domcontentloaded" });
// Wait for app to be fully loaded
await expect(page.locator("#canvas")).toBeVisible({ timeout: 10000 });
});

test.describe("Shape Creation", () => {
test("should create a circle", async ({ page }) => {
await createShape(page, "circle");
// Verify the shape exists by checking for canvas items
await expect(page.locator("[data-item-id]")).toHaveCount(1);
});

test("should create a square", async ({ page }) => {
await createShape(page, "square");
await expect(page.locator("[data-item-id]")).toHaveCount(1);
});

test("should create a triangle", async ({ page }) => {
await createShape(page, "triangle");
await expect(page.locator("[data-item-id]")).toHaveCount(1);
});

test("should create a star", async ({ page }) => {
await createShape(page, "star");
await expect(page.locator("[data-item-id]")).toHaveCount(1);
});

test("should create multiple shapes", async ({ page }) => {
// Create multiple different shapes
await createShape(page, "circle");
await createShape(page, "square");
await createShape(page, "triangle");

// Verify all shapes exist
await expect(page.locator("[data-item-id]")).toHaveCount(3);
});
});

test.describe("Note Creation", () => {
test("should create a note", async ({ page }) => {
await page.getByRole("button", { name: /note/i }).click();
await expect(page.locator("[data-item-id]")).toHaveCount(1);
});

test("should edit note text", async ({ page }) => {
// Create a note
await page.getByRole("button", { name: /note/i }).click();
const note = page.locator("[data-item-id]").first();
await expect(note).toBeVisible();

// Click note and type
await note.locator("textarea").click();
await page.keyboard.type("Test note content");
await expect(note.locator("textarea")).toHaveValue("Test note content");
});

test("should create multiple notes", async ({ page }) => {
await page.getByRole("button", { name: /note/i }).click();
await page.getByRole("button", { name: /note/i }).click();
await expect(page.locator("[data-item-id]")).toHaveCount(2);
});
});

test.describe("Table Creation", () => {
test("should create a table", async ({ page }) => {
await page.getByRole("button", { name: /table/i }).click();
// Verify the table exists
await expect(page.locator("[data-item-id]")).toHaveCount(1);
});
});

test.describe("Selection and Manipulation", () => {
test("should delete selected item", async ({ page }) => {
// Create an item first
await createShape(page, "circle");
const shape = page.locator("[data-item-id]").first();
await expect(shape).toBeVisible();

// Click to select
await shape.click();
// Press Delete key
await page.keyboard.press("Delete");
// Verify item is gone
await expect(page.locator("[data-item-id]")).toHaveCount(0);
});

test("should duplicate selected item", async ({ page }) => {
// Create an item first
await createShape(page, "circle");
const shape = page.locator("[data-item-id]").first();
await expect(shape).toBeVisible();

// Click to select
await shape.click();
// Press Ctrl+D to duplicate
await page.keyboard.press("Control+D");
// Verify we now have 2 items
await expect(page.locator("[data-item-id]")).toHaveCount(2);
});
});
});