# Group Connections Feature

## Overview

Groups can now be connected to each other with directional arrows. This feature enables creating flowcharts, process diagrams, and relationship maps within the canvas.

## User Interface

### Connection Points

Each group displays **4 connection points** (blue circles) on its sides:

- **Top** - Center of the top edge
- **Right** - Center of the right edge
- **Bottom** - Center of the bottom edge
- **Left** - Center of the left edge

Connection points are visible on all groups and can be interacted with using a crosshair cursor.

### Creating Connections

1. **Click and drag** from a connection point on one group
2. A **temporary dashed line** follows your cursor showing the connection being created
3. **Release** over a connection point on another group to complete the connection
4. An **arrow line** appears showing the directional connection

### Connection Visualization

- **Blue solid lines** with **arrowheads** show the direction of connection
- Lines automatically **route around obstacles** (shapes, notes, tables) to avoid overlapping
- The connection **sides are calculated automatically** based on the positions of the connected groups
- Lines update dynamically as groups are moved

## Technical Implementation

### Schema

Connections are stored in the `Item.connections` array as simple string IDs:

```typescript
class Item {
	connections: string[]; // Array of item IDs that connect TO this item
}
```

### Connection Direction

Connections are **unidirectional**:

- If Group A's ID is in Group B's connections array: `A → B`
- For bidirectional: Both groups include each other's ID

### Auto-Routing Algorithm

The connection lines use **A\* pathfinding** to route around obstacles:

1. **Direct path check** - If no obstacles, draw straight line
2. **Waypoint generation** - Create potential waypoints around obstacle corners (with padding)
3. **A\* pathfinding** - Find shortest valid path through waypoints
4. **Path simplification** - Remove unnecessary intermediate points

### Side Calculation

Connection sides are calculated dynamically based on item positions:

```typescript
function calculateConnectionSides(from: Rect, to: Rect): [Side, Side] {
	// Determines closest side of source to target
	// Returns opposite side on target for natural flow
}
```

### Components

**ConnectionOverlay.tsx** - Main overlay component containing:

- `ConnectionPoints` - Renders the 4 blue circles on each group
- `ConnectionLine` - Renders routed arrow lines for existing connections
- `TempConnectionLine` - Shows dragging preview
- `ConnectionOverlay` - Orchestrates drag state and rendering

**connections.ts** - Utility functions:

- `getConnectionPoint()` - Calculate point position on rectangle side
- `calculateConnectionSides()` - Determine best sides to connect
- `getClosestSide()` / `getOppositeSide()` - Side calculations

**pathfinding.ts** - A\* routing algorithm:

- `generateWaypoints()` - Main entry point for path calculation
- `findPath()` - A\* implementation
- `simplifyPath()` - Remove collinear points
- `lineIntersectsRect()` - Collision detection

## Usage Examples

### Simple Flow

```
[Start Group] → [Process Group] → [End Group]
```

Create a linear flow by dragging from right side of each group to the left side of the next.

### Bidirectional

```
[Group A] ⇄ [Group B]
```

Drag A→B, then drag B→A to create two-way connection.

### Complex Diagram

```
       ┌──────────────┐
       │              │
       ▼              │
[A] → [B] → [C] → [D]─┘
       │
       └──→ [E]
```

Multiple connections from single groups are supported. Lines automatically route to avoid overlaps.

## Future Enhancements

- **Connection labels** - Add text labels to connection lines
- **Connection styles** - Different line styles (dashed, dotted, colors)
- **Delete connections** - UI for removing connections (currently requires code)
- **Connection types** - Support different relationship types
- **Snap to grid** - Connection points snap to grid when groups use grid layout
- **Curved paths** - Option for curved/bezier connection lines instead of straight segments
