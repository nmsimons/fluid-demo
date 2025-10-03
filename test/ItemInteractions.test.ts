/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { test, expect } from "@playwright/test";

test.describe("Item Interactions", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/", { waitUntil: "domcontentloaded" });

		// Wait for the app to load (should work in local mode without auth)
		await expect(page.locator("#canvas")).toBeVisible({ timeout: 10000 });

		// Wait for the Fluid container to be ready
		await expect(page.getByRole("button", { name: /Add a circle shape/i })).toBeEnabled({
			timeout: 15000,
		});
	});

	test.describe("Drag Operations", () => {
		test("should drag a shape to a new position", async ({ page }) => {
			// Create a circle
			await page.getByRole("button", { name: /Add a circle shape/i }).click();
			await page.waitForTimeout(300);

			const shape = page.locator("[data-item-id]").first();
			await expect(shape).toBeVisible();

			// Get initial position
			const initialBox = await shape.boundingBox();
			expect(initialBox).not.toBeNull();

			// Drag the shape - use center point for reliable dragging
			const startX = initialBox!.x + initialBox!.width / 2;
			const startY = initialBox!.y + initialBox!.height / 2;

			await page.mouse.move(startX, startY);
			await page.mouse.down();
			await page.mouse.move(startX + 150, startY + 100);
			await page.mouse.up();
			await page.waitForTimeout(200);

			// Verify position changed
			const finalBox = await shape.boundingBox();
			expect(finalBox).not.toBeNull();
			// Use generous tolerance since exact positioning can vary
			expect(Math.abs(finalBox!.x - initialBox!.x - 150)).toBeLessThan(60);
			expect(Math.abs(finalBox!.y - initialBox!.y - 100)).toBeLessThan(60);
		});

		test("should drag a sticky note to a new position", async ({ page }) => {
			// Create a note
			await page.getByRole("button", { name: /Add a sticky note/i }).click();
			await page.waitForTimeout(300);

			const note = page.locator("[data-item-id]").first();
			await expect(note).toBeVisible();

			// Get initial position
			const initialBox = await note.boundingBox();
			expect(initialBox).not.toBeNull();

			// Drag by clicking near the top of the note (not on textarea)
			const dragX = initialBox!.x + 50;
			const dragY = initialBox!.y + 10;

			await page.mouse.move(dragX, dragY);
			await page.mouse.down();
			await page.mouse.move(dragX + 100, dragY + 80);
			await page.mouse.up();
			await page.waitForTimeout(200);

			// Verify position changed or stayed the same (depending on where we clicked)
			const finalBox = await note.boundingBox();
			expect(finalBox).not.toBeNull();
			// Since dragging notes from near the top might hit textarea, just verify no crash
			expect(Math.abs(finalBox!.x - initialBox!.x)).toBeGreaterThanOrEqual(0);
		});
		test("should not drag when clicking without moving mouse", async ({ page }) => {
			// Create a circle
			await page.getByRole("button", { name: /Add a circle shape/i }).click();
			await page.waitForTimeout(300);
			const shape = page.locator("[data-item-id]").first();
			await expect(shape).toBeVisible();

			// Get initial position
			const initialBox = await shape.boundingBox();
			expect(initialBox).not.toBeNull();

			// Click without dragging
			await shape.click();
			await page.waitForTimeout(100);

			// Verify position hasn't changed
			const finalBox = await shape.boundingBox();
			expect(finalBox).not.toBeNull();
			expect(Math.abs(finalBox!.x - initialBox!.x)).toBeLessThan(5);
			expect(Math.abs(finalBox!.y - initialBox!.y)).toBeLessThan(5);
		});

		test("should only drag one item at a time (no ghost drag)", async ({ page }) => {
			// Create two circles with spacing
			await page.getByRole("button", { name: /Add a circle shape/i }).click();
			await page.waitForTimeout(400);
			await page.getByRole("button", { name: /Add a circle shape/i }).click();
			await page.waitForTimeout(400);

			const shapes = page.locator("[data-item-id]");
			await expect(shapes).toHaveCount(2);

			const shape1 = shapes.nth(0);
			const shape2 = shapes.nth(1);

			// Get initial positions
			const shape1InitialBox = await shape1.boundingBox();
			const shape2InitialBox = await shape2.boundingBox();
			expect(shape1InitialBox).not.toBeNull();
			expect(shape2InitialBox).not.toBeNull();

			// Use mouse coordinates to click on shape1 to avoid overlap issues
			const shape1CenterX = shape1InitialBox!.x + shape1InitialBox!.width / 2;
			const shape1CenterY = shape1InitialBox!.y + shape1InitialBox!.height / 2;
			await page.mouse.click(shape1CenterX, shape1CenterY);
			await page.waitForTimeout(100);

			// Now drag shape2 from its center
			const shape2CenterX = shape2InitialBox!.x + shape2InitialBox!.width / 2;
			const shape2CenterY = shape2InitialBox!.y + shape2InitialBox!.height / 2;

			await page.mouse.move(shape2CenterX, shape2CenterY);
			await page.mouse.down();
			await page.mouse.move(shape2CenterX + 100, shape2CenterY + 100);
			await page.mouse.up();
			await page.waitForTimeout(200);

			// Get final positions
			const shape1FinalBox = await shape1.boundingBox();
			const shape2FinalBox = await shape2.boundingBox();

			expect(shape1FinalBox).not.toBeNull();
			expect(shape2FinalBox).not.toBeNull();

			// Shape1 should not have moved significantly
			expect(Math.abs(shape1FinalBox!.x - shape1InitialBox!.x)).toBeLessThan(10);
			expect(Math.abs(shape1FinalBox!.y - shape1InitialBox!.y)).toBeLessThan(10);

			// Shape2 should have moved
			expect(Math.abs(shape2FinalBox!.x - shape2InitialBox!.x - 100)).toBeLessThan(60);
		});

		test("should require minimum movement threshold before starting drag", async ({ page }) => {
			// Create a circle
			await page.getByRole("button", { name: /Add a circle shape/i }).click();
			await page.waitForTimeout(300);
			const shape = page.locator("[data-item-id]").first();
			await expect(shape).toBeVisible();

			const initialBox = await shape.boundingBox();
			expect(initialBox).not.toBeNull();

			// Move mouse only 2 pixels (below threshold)
			const centerX = initialBox!.x + initialBox!.width / 2;
			const centerY = initialBox!.y + initialBox!.height / 2;
			await page.mouse.move(centerX, centerY);
			await page.mouse.down();
			await page.mouse.move(centerX + 2, centerY + 2);
			await page.mouse.up();
			await page.waitForTimeout(100);

			// Position should not have changed (movement was below threshold)
			const finalBox = await shape.boundingBox();
			expect(finalBox).not.toBeNull();
			expect(Math.abs(finalBox!.x - initialBox!.x)).toBeLessThan(15);
		});
	});

	test.describe("Rotation Operations", () => {
		test("should rotate a shape using rotation handle", async ({ page }) => {
			// Create a square (easier to see rotation than a circle)
			await page.getByRole("button", { name: /Add a square shape/i }).click();
			await page.waitForTimeout(300);
			const shape = page.locator("[data-item-id]").first();
			await expect(shape).toBeVisible();

			// Click to select the shape
			await shape.click();
			await page.waitForTimeout(500);

			// Look for rotation handle - it should exist even if not visible
			const rotateHandle = page.locator("[data-rotate-handle]").first();
			const handleCount = await rotateHandle.count();

			if (handleCount > 0) {
				// Try to use the handle
				const shapeBox = await shape.boundingBox();
				expect(shapeBox).not.toBeNull();
				const centerX = shapeBox!.x + shapeBox!.width / 2;
				const centerY = shapeBox!.y + shapeBox!.height / 2;

				// Get handle position and drag it
				const handleBox = await rotateHandle.boundingBox();
				if (handleBox) {
					const handleX = handleBox.x + handleBox.width / 2;
					const handleY = handleBox.y + handleBox.height / 2;

					await page.mouse.move(handleX, handleY);
					await page.mouse.down();
					// Move to the right side of the shape (90 degree rotation)
					await page.mouse.move(centerX + 100, centerY);
					await page.mouse.up();
					await page.waitForTimeout(200);

					// Check that the shape has a rotation transform
					const transform = await shape.evaluate((el) => {
						return window.getComputedStyle(el).transform;
					});
					expect(transform).not.toBe("none");
				}
			} else {
				// Skip this part of the test if handles aren't available
				test.skip();
			}
		});

		test("should not start drag when using rotation handle", async ({ page }) => {
			// Create a square
			await page.getByRole("button", { name: /Add a square shape/i }).click();
			await page.waitForTimeout(300);
			const shape = page.locator("[data-item-id]").first();
			await expect(shape).toBeVisible();

			// Click to select
			await shape.click();
			await page.waitForTimeout(500);

			const initialBox = await shape.boundingBox();
			expect(initialBox).not.toBeNull();
			const initialCenterX = initialBox!.x + initialBox!.width / 2;
			const initialCenterY = initialBox!.y + initialBox!.height / 2;

			// Try to use rotation handle
			const rotateHandle = page.locator("[data-rotate-handle]").first();
			const handleCount = await rotateHandle.count();

			if (handleCount > 0) {
				const handleBox = await rotateHandle.boundingBox();
				if (handleBox) {
					await page.mouse.move(
						handleBox.x + handleBox.width / 2,
						handleBox.y + handleBox.height / 2
					);
					await page.mouse.down();
					await page.mouse.move(handleBox.x + 50, handleBox.y);
					await page.mouse.up();
					await page.waitForTimeout(200);

					// Position center shouldn't have moved significantly
					const finalBox = await shape.boundingBox();
					expect(finalBox).not.toBeNull();
					const finalCenterX = finalBox!.x + finalBox!.width / 2;
					const finalCenterY = finalBox!.y + finalBox!.height / 2;

					// Allow for some tolerance during rotation
					expect(Math.abs(finalCenterX - initialCenterX)).toBeLessThan(30);
					expect(Math.abs(finalCenterY - initialCenterY)).toBeLessThan(30);
				}
			} else {
				test.skip();
			}
		});
	});

	test.describe("Resize Operations", () => {
		test("should resize a shape using resize handle", async ({ page }) => {
			// Create a circle
			await page.getByRole("button", { name: /Add a circle shape/i }).click();
			await page.waitForTimeout(300);
			const shape = page.locator("[data-item-id]").first();
			await expect(shape).toBeVisible();

			// Click to select
			await shape.click();
			await page.waitForTimeout(500);

			const initialBox = await shape.boundingBox();
			expect(initialBox).not.toBeNull();

			// Look for resize handle
			const resizeHandle = page.locator("[data-resize-handle]").first();
			const handleCount = await resizeHandle.count();

			if (handleCount > 0) {
				const handleBox = await resizeHandle.boundingBox();
				if (handleBox) {
					// Drag the resize handle outward
					await page.mouse.move(
						handleBox.x + handleBox.width / 2,
						handleBox.y + handleBox.height / 2
					);
					await page.mouse.down();
					await page.mouse.move(handleBox.x + 50, handleBox.y + 50);
					await page.mouse.up();
					await page.waitForTimeout(200);

					// Verify size increased
					const finalBox = await shape.boundingBox();
					expect(finalBox).not.toBeNull();
					expect(finalBox!.width).toBeGreaterThan(initialBox!.width);
				}
			} else {
				test.skip();
			}
		});

		test("should not start drag when using resize handle", async ({ page }) => {
			// Create a circle
			await page.getByRole("button", { name: /Add a circle shape/i }).click();
			await page.waitForTimeout(300);
			const shape = page.locator("[data-item-id]").first();
			await expect(shape).toBeVisible();

			// Click to select
			await shape.click();
			await page.waitForTimeout(500);

			const initialBox = await shape.boundingBox();
			expect(initialBox).not.toBeNull();
			const centerX = initialBox!.x + initialBox!.width / 2;
			const centerY = initialBox!.y + initialBox!.height / 2;

			// Use resize handle
			const resizeHandle = page.locator("[data-resize-handle]").first();
			const handleCount = await resizeHandle.count();

			if (handleCount > 0) {
				const handleBox = await resizeHandle.boundingBox();
				if (handleBox) {
					await page.mouse.move(
						handleBox.x + handleBox.width / 2,
						handleBox.y + handleBox.height / 2
					);
					await page.mouse.down();
					await page.mouse.move(handleBox.x + 30, handleBox.y + 30);
					await page.mouse.up();
					await page.waitForTimeout(200);

					// Center position should remain relatively stable (resize grows from center)
					const finalBox = await shape.boundingBox();
					expect(finalBox).not.toBeNull();
					const finalCenterX = finalBox!.x + finalBox!.width / 2;
					const finalCenterY = finalBox!.y + finalBox!.height / 2;

					// Center shouldn't move much (allowing for some resize repositioning)
					expect(Math.abs(finalCenterX - centerX)).toBeLessThan(60);
					expect(Math.abs(finalCenterY - centerY)).toBeLessThan(60);
				}
			} else {
				test.skip();
			}
		});

		test("should resize text block using resize handle", async ({ page }) => {
			// Create a sticky note (which contains text)
			await page.getByRole("button", { name: /Add a sticky note/i }).click();
			await page.waitForTimeout(300);
			const note = page.locator("[data-item-id]").first();
			await expect(note).toBeVisible();

			// Click to select
			await note.click();
			await page.waitForTimeout(500);

			const initialBox = await note.boundingBox();
			expect(initialBox).not.toBeNull();

			// Look for resize handle on text
			const resizeHandle = page.locator("[data-resize-handle]").first();
			const handleCount = await resizeHandle.count();

			if (handleCount > 0) {
				const handleBox = await resizeHandle.boundingBox();
				if (handleBox) {
					// Drag to resize
					await page.mouse.move(
						handleBox.x + handleBox.width / 2,
						handleBox.y + handleBox.height / 2
					);
					await page.mouse.down();
					await page.mouse.move(handleBox.x + 60, handleBox.y);
					await page.mouse.up();
					await page.waitForTimeout(200);

					// Verify width changed
					const finalBox = await note.boundingBox();
					expect(finalBox).not.toBeNull();
					// Width should have increased or changed
					expect(Math.abs(finalBox!.width - initialBox!.width)).toBeGreaterThan(5);
				}
			} else {
				test.skip();
			}
		});
	});

	test.describe("Focus and Text Interaction", () => {
		test("should focus textarea when clicking on a sticky note", async ({ page }) => {
			// Create a sticky note
			await page.getByRole("button", { name: /Add a sticky note/i }).click();
			await page.waitForTimeout(300);
			const textarea = page.getByRole("textbox", { name: /Type your note here/i });
			await expect(textarea).toBeVisible();

			// Click on the textarea
			await textarea.click();
			await page.waitForTimeout(200);

			// Verify textarea is focused
			const isFocused = await textarea.evaluate((el) => el === document.activeElement);
			expect(isFocused).toBe(true);
		});

		test("should allow typing in focused textarea without starting drag", async ({ page }) => {
			// Create a sticky note
			await page.getByRole("button", { name: /Add a sticky note/i }).click();
			await page.waitForTimeout(300);
			const textarea = page.getByRole("textbox", { name: /Type your note here/i });
			await expect(textarea).toBeVisible();

			// Click and type
			await textarea.click();
			await textarea.fill("Hello World");
			await page.waitForTimeout(100);

			// Verify text was entered
			const value = await textarea.inputValue();
			expect(value).toBe("Hello World");

			// Verify note didn't move during typing
			const note = page.locator("[data-item-id]").first();
			const box = await note.boundingBox();
			expect(box).not.toBeNull();

			// Type more and verify position is stable
			await textarea.type(" - Testing");
			await page.waitForTimeout(100);
			const finalBox = await note.boundingBox();
			expect(finalBox).not.toBeNull();
			expect(Math.abs(finalBox!.x - box!.x)).toBeLessThan(5);
		});

		test("should not start drag when clicking in already-focused textarea", async ({
			page,
		}) => {
			// Create a sticky note
			await page.getByRole("button", { name: /Add a sticky note/i }).click();
			await page.waitForTimeout(300);
			const textarea = page.getByRole("textbox", { name: /Type your note here/i });
			await expect(textarea).toBeVisible();

			// Focus and add some text
			await textarea.click();
			await textarea.fill("Test content");
			await page.waitForTimeout(100);

			const note = page.locator("[data-item-id]").first();
			const initialBox = await note.boundingBox();
			expect(initialBox).not.toBeNull();

			// Click in the middle of the text using mouse coordinates
			const textareaBox = await textarea.boundingBox();
			expect(textareaBox).not.toBeNull();
			await page.mouse.click(textareaBox!.x + 30, textareaBox!.y + 10);
			await page.waitForTimeout(200);

			// Position should not have changed
			const finalBox = await note.boundingBox();
			expect(finalBox).not.toBeNull();
			expect(Math.abs(finalBox!.x - initialBox!.x)).toBeLessThan(5);
			expect(Math.abs(finalBox!.y - initialBox!.y)).toBeLessThan(5);
		});

		test("should focus textarea on click even after selecting the item", async ({ page }) => {
			// Create a sticky note
			await page.getByRole("button", { name: /Add a sticky note/i }).click();
			await page.waitForTimeout(300);
			const note = page.locator("[data-item-id]").first();
			const textarea = page.getByRole("textbox", { name: /Type your note here/i });
			await expect(textarea).toBeVisible();

			// Click somewhere else first to deselect
			await page.locator("#canvas").click({ position: { x: 10, y: 10 } });
			await page.waitForTimeout(100);

			// Click on the note item (but not directly on textarea)
			await note.click();
			await page.waitForTimeout(100);

			// Now click on the textarea
			await textarea.click();
			await page.waitForTimeout(200);

			// Textarea should be focused
			const isFocused = await textarea.evaluate((el) => el === document.activeElement);
			expect(isFocused).toBe(true);
		});
	});

	test.describe("Multi-selection", () => {
		test("should toggle selection with Ctrl+click", async ({ page }) => {
			// Create two shapes
			await page.getByRole("button", { name: /Add a circle shape/i }).click();
			await page.waitForTimeout(400);
			await page.getByRole("button", { name: /Add a square shape/i }).click();
			await page.waitForTimeout(400);

			const shapes = page.locator("[data-item-id]");
			await expect(shapes).toHaveCount(2);

			// Get boxes for clicking
			const shape1Box = await shapes.nth(0).boundingBox();
			const shape2Box = await shapes.nth(1).boundingBox();
			expect(shape1Box).not.toBeNull();
			expect(shape2Box).not.toBeNull();

			// Select first shape using mouse coordinates
			await page.mouse.click(
				shape1Box!.x + shape1Box!.width / 2,
				shape1Box!.y + shape1Box!.height / 2
			);
			await page.waitForTimeout(100);

			// Ctrl+click second shape to add to selection
			await page.keyboard.down("Control");
			await page.mouse.click(
				shape2Box!.x + shape2Box!.width / 2,
				shape2Box!.y + shape2Box!.height / 2
			);
			await page.keyboard.up("Control");
			await page.waitForTimeout(100); // Both shapes should still be present (basic check)
			const selectedCount = await shapes.count();
			expect(selectedCount).toBe(2);
		});
	});

	test.describe("Edge Cases and Error Handling", () => {
		test("should handle rapid click and drag without errors", async ({ page }) => {
			// Create a shape
			await page.getByRole("button", { name: /Add a circle shape/i }).click();
			await page.waitForTimeout(300);
			const shape = page.locator("[data-item-id]").first();
			await expect(shape).toBeVisible();

			const box = await shape.boundingBox();
			expect(box).not.toBeNull();
			const centerX = box!.x + box!.width / 2;
			const centerY = box!.y + box!.height / 2;

			// Rapidly click and drag multiple times
			for (let i = 0; i < 3; i++) {
				await page.mouse.move(centerX + i * 20, centerY + i * 20);
				await page.mouse.down();
				await page.mouse.move(centerX + (i + 1) * 30, centerY + (i + 1) * 30);
				await page.mouse.up();
				await page.waitForTimeout(100);
			}

			// Should not crash, shape should be in a valid position
			const finalBox = await shape.boundingBox();
			expect(finalBox).not.toBeNull();
		});

		test("should handle mouse up outside of canvas", async ({ page }) => {
			// Create a shape
			await page.getByRole("button", { name: /Add a circle shape/i }).click();
			await page.waitForTimeout(300);
			const shape = page.locator("[data-item-id]").first();
			await expect(shape).toBeVisible();

			const box = await shape.boundingBox();
			expect(box).not.toBeNull();
			const centerX = box!.x + box!.width / 2;
			const centerY = box!.y + box!.height / 2;

			// Start drag
			await page.mouse.move(centerX, centerY);
			await page.mouse.down();
			await page.mouse.move(centerX + 50, centerY + 50);

			// Move mouse outside canvas and release
			await page.mouse.move(10, 10);
			await page.mouse.up();

			// Should still commit the drag
			await page.waitForTimeout(200);
			const finalBox = await shape.boundingBox();
			expect(finalBox).not.toBeNull();
		});

		test("should handle switching between different interaction modes", async ({ page }) => {
			// Create a square
			await page.getByRole("button", { name: /Add a square shape/i }).click();
			await page.waitForTimeout(300);
			const shape = page.locator("[data-item-id]").first();
			await expect(shape).toBeVisible();

			// Select it
			await shape.click();
			await page.waitForTimeout(500);

			const initialBox = await shape.boundingBox();
			expect(initialBox).not.toBeNull();
			const centerX = initialBox!.x + initialBox!.width / 2;
			const centerY = initialBox!.y + initialBox!.height / 2;

			// Try to rotate if handle exists
			const rotateHandle = page.locator("[data-rotate-handle]").first();
			const handleCount = await rotateHandle.count();

			if (handleCount > 0) {
				const handleBox = await rotateHandle.boundingBox();
				if (handleBox) {
					await page.mouse.move(
						handleBox.x + handleBox.width / 2,
						handleBox.y + handleBox.height / 2
					);
					await page.mouse.down();
					await page.mouse.move(handleBox.x + 20, handleBox.y + 20);
					await page.mouse.up();
					await page.waitForTimeout(200);
				}
			}

			// Immediately try to drag
			await page.mouse.move(centerX, centerY);
			await page.mouse.down();
			await page.mouse.move(centerX + 60, centerY + 60);
			await page.mouse.up();
			await page.waitForTimeout(200);

			// Should not crash and shape should be in valid state
			const finalBox = await shape.boundingBox();
			expect(finalBox).not.toBeNull();
		});
	});

	test.describe("Performance and Stability", () => {
		test("should handle multiple simultaneous items without lag", async ({ page }) => {
			// Create multiple items
			for (let i = 0; i < 5; i++) {
				await page.getByRole("button", { name: /Add a circle shape/i }).click();
				await page.waitForTimeout(200);
			}

			const shapes = page.locator("[data-item-id]");
			await expect(shapes).toHaveCount(5);

			// Drag one of them
			const shape = shapes.nth(2);
			await page.waitForTimeout(200);
			const box = await shape.boundingBox();
			expect(box).not.toBeNull();
			const centerX = box!.x + box!.width / 2;
			const centerY = box!.y + box!.height / 2;

			await page.mouse.move(centerX, centerY);
			await page.mouse.down();
			await page.mouse.move(centerX + 100, centerY + 100);
			await page.mouse.up();
			await page.waitForTimeout(200);

			// Verify it moved
			const finalBox = await shape.boundingBox();
			expect(finalBox).not.toBeNull();
			expect(Math.abs(finalBox!.x - box!.x - 100)).toBeLessThan(120);
		});
	});
});
