# Item Connections

## Overview

Items in the Fluid Demo app now support directional connections between each other. This enables features like flowcharts, mind maps, and relationship diagrams.

## Schema Design

Each `Item` has a `connections` field that is an array of item IDs:

```typescript
connections: sf.array(sf.string);
```

### Directional Connections

The `connections` array represents **items that connect TO this item**. In other words, if item A's ID is in item B's connections array, there is a connection from A → B.

**Example:**

```typescript
// Item A connects to Item B
itemB.connections; // Contains itemA.id

// This represents: A → B
```

### Bidirectional Connections

For a bidirectional connection, both items must include each other's ID in their connections arrays:

**Example:**

```typescript
// Bidirectional connection between A and B
itemA.connections; // Contains itemB.id
itemB.connections; // Contains itemA.id

// This represents: A ↔ B
```

## API Methods

The `Item` class provides helper methods for managing connections:

### `addConnection(fromItemId: string): void`

Adds a directional connection TO this item from another item.

```typescript
itemB.addConnection(itemA.id); // Creates A → B
```

### `removeConnection(fromItemId: string): void`

Removes a connection from a specific item.

```typescript
itemB.removeConnection(itemA.id); // Removes A → B
```

### `hasConnection(fromItemId: string): boolean`

Check if a connection exists from a specific item.

```typescript
if (itemB.hasConnection(itemA.id)) {
	console.log("A connects to B");
}
```

### `getConnections(): string[]`

Get all item IDs that connect TO this item.

```typescript
const connectedItems = itemB.getConnections();
```

## Usage Examples

### Creating a Simple Flow

```typescript
// Create three items
const start = items.createNoteItem(canvasSize, userId);
const middle = items.createShapeItem("square", canvasSize, colors);
const end = items.createNoteItem(canvasSize, userId);

// Create flow: start → middle → end
middle.addConnection(start.id);
end.addConnection(middle.id);
```

### Creating a Bidirectional Link

```typescript
const itemA = items.createShapeItem("circle", canvasSize, colors);
const itemB = items.createShapeItem("square", canvasSize, colors);

// Create bidirectional connection
itemA.addConnection(itemB.id);
itemB.addConnection(itemA.id);
```

### Finding All Connections

```typescript
// Find all items that connect TO a specific item
const incomingConnections = targetItem.getConnections();

// Find all items that this item connects TO (requires iteration)
function findOutgoingConnections(item: Item, allItems: Items): string[] {
	return allItems
		.filter((otherItem) => otherItem.hasConnection(item.id))
		.map((otherItem) => otherItem.id);
}
```

## Implementation Notes

- The `connections` field is initialized as an empty array for all newly created items
- Connections are stored as item IDs (strings), not direct references
- Deleting an item does NOT automatically clean up connections pointing to it (you may want to implement this)
- The schema is flexible enough to support multiple connections from different items

## Future Enhancements

Potential features to build on top of this foundation:

1. **Connection Rendering**: Draw lines/arrows between connected items on the canvas
2. **Connection Validation**: Prevent cycles, validate connection types, etc.
3. **Auto-cleanup**: Remove dangling connections when items are deleted
4. **Connection Metadata**: Add properties like line style, color, labels
5. **Connection Types**: Support different relationship types (e.g., "parent", "dependency", "reference")
