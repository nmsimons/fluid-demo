export const domainHints = `This is a collaborative 2D canvas application built on Fluid Framework that allows users to position shapes, notes, text blocks, tables, and groups on an infinite canvas.
The canvas also supports ink drawing. Items can be moved, rotated, resized, and have style properties changed.
Each item can have comments and votes associated with it.

AVAILABLE METHODS:
The schema exposes all available methods that you can call on objects in the tree. Use autocomplete/IntelliSense or explore the object structure to discover available operations. All public methods on schema objects (Items, FluidTable, Item, Comments, Votes, etc.) are available for use.

  const { root } = context;
  // Create a NEW AI user for THIS item (don't reuse User objects!)
  const aiUser = context.create.User({ id: "AI", name: "AI" });
  const noteItem = root.items.createNoteItem({ width: 1600, height: 900 }, aiUser);

CRITICAL: You MUST create a new User object for each item. You CANNOT reuse the same User object because 
once it's inserted into the tree (as createdBy), it becomes "attached" and cannot be inserted again.

WRONG - Reusing the same User object:
  const aiUser = context.create.User({ id: "AI", name: "AI" });
  const item1 = root.items.createNoteItem({ width: 1600, height: 900 }, aiUser);
  const item2 = root.items.createShapeItem('circle', { width: 1600, height: 900 }, ['#FF0000'], true, aiUser); // ERROR!

CORRECT - Create a new User for each item:
  const aiUser1 = context.create.User({ id: "AI", name: "AI" });
  const item1 = root.items.createNoteItem({ width: 1600, height: 900 }, aiUser1);
  const aiUser2 = context.create.User({ id: "AI", name: "AI" });
  const item2 = root.items.createShapeItem('circle', { width: 1600, height: 900 }, ['#FF0000'], true, aiUser2);

WHAT WORKS: You CAN successfully:
- Create new items (notes, shapes, tables, text blocks, groups) using the User workaround above
- Modify existing items (change positions, colors, text, properties)
- Delete items
- Duplicate items (with User workaround)
- Add/remove comments on items
- Add/remove votes on items
- Modify table data (add/remove rows and columns, change cell values)
- Query and analyze the canvas state
- Adjust item layering (z-order operations)
- Work with connections between items
- Nest items inside groups

CRITICAL CONTEXT OBJECT:
The 'context' object passed to AI-generated code contains:
- context.root: The App root object with items, comments, and inks arrays
- context.tree: The TreeView instance (for advanced operations)
- context.user: A User object with { id: string, name: string } for the current user

EXECUTION ENVIRONMENT:
- Your code is executed via 'new Function()' and is NOT async - DO NOT use 'await' or 'async' keywords
- All operations are synchronous
- The code runs in a plain JavaScript function context, not a module

USER INFORMATION:
ALWAYS create a NEW synthetic AI user for EACH item you create. DO NOT reuse User objects.
Pattern: const aiUser = context.create.User({ id: "AI", name: "AI" });
Remember: Each User object can only be inserted into the tree once (as createdBy), so create a fresh one for each item.

DATA MODEL OVERVIEW:
The application has a root App object containing:
- items: An Items array (all canvas items like shapes, notes, tables, text, groups)
- comments: A Comments array (canvas-level comments)
- inks: An array of InkStroke objects (freehand drawings)

Each Item contains:
- id: unique identifier (UUID string)
- x, y: position coordinates (numbers, can be negative)
- rotation: rotation in degrees (number)
- createdBy, createdAt: user and timestamp of creation
- updatedBy, updatedAt: array of users who modified it and last update timestamp
- comments: Comments array attached to this item
- votes: Votes array for voting on this item
- connections: array of item IDs representing directional connections TO this item
- content: one of Shape, Note, TextBlock, FluidTable, or Group

Content Types:
- Shape: Geometric shapes (circle, square, triangle, star, rectangle) with color, size, and filled/outline properties
- Note: Sticky notes with text and background color
- TextBlock: Rich text with formatting (bold, italic, underline, strikethrough, alignment, card style)
- FluidTable: Tables with rows and columns containing typed data (string, number, boolean, DateTime, Vote)
- Group: Container for other items with a name and optional grid layout (items nested in group.content.items)

Here's an example of a canvas with a table and some shapes:

\`\`\`JSON
{
  "items": [
    {
      // Index: 0,
      "id": "76a507c4-c2a5-4451-804a-48be7e055489",
      "x": -235.25373134328362,
      "y": -110.28358208955223,
      "rotation": 0,
      "comments": [
        {
          // Index: 0,
          "id": "d29e1b0d-c331-4d64-a5af-22f5904640c2",
          "text": "This table has a comment, too!",
          "user": {
            "id": "dc8ae028-9ae3-485d-9d26-6a32f3106745.72f988bf-86f1-41af-91ab-2d7cd011db47",
            "name": "Taylor Williams"
          },
          "votes": [],
          "createdAt": {
            "ms": 1758596709793
          }
        }
      ],
      "votes": {
        "votes": []
      },
      "content": {
        "rows": [
          {
            // Index: 0,
            "id": "6debf732-c8ec-42b5-a173-315ca0a6d25b",
            "cells": {
              "41ecf895-2166-4791-93e5-2f5de0a740ab": "India",
              "4fe5baf7-e3cf-4d12-bb4f-f2c7afda4023": 1429,
              "2c44aa92-1048-4143-b852-856923148546": 3940
            }
          },
          {
            // Index: 1,
            "id": "bb18fc3b-691b-4fef-9c8d-71b1fa0a6f70",
            "cells": {
              "41ecf895-2166-4791-93e5-2f5de0a740ab": "China",
              "4fe5baf7-e3cf-4d12-bb4f-f2c7afda4023": 1412,
              "2c44aa92-1048-4143-b852-856923148546": 18530
            }
          },
          {
            // Index: 2,
            "id": "c74659b9-adc8-4f09-9c6b-10d7fac0d37b",
            "cells": {
              "41ecf895-2166-4791-93e5-2f5de0a740ab": "United States",
              "4fe5baf7-e3cf-4d12-bb4f-f2c7afda4023": 334,
              "2c44aa92-1048-4143-b852-856923148546": 27970
            }
          },
          {
            // Index: 3,
            "id": "72d8ac26-16ce-4cfa-8e73-60bb9a310589",
            "cells": {
              "41ecf895-2166-4791-93e5-2f5de0a740ab": "Indonesia",
              "4fe5baf7-e3cf-4d12-bb4f-f2c7afda4023": 278,
              "2c44aa92-1048-4143-b852-856923148546": 1570
            }
          },
          {
            // Index: 4,
            "id": "674a36a3-6fb3-4f7a-96dd-0e39a1d8306a",
            "cells": {
              "41ecf895-2166-4791-93e5-2f5de0a740ab": "Pakistan",
              "4fe5baf7-e3cf-4d12-bb4f-f2c7afda4023": 241,
              "2c44aa92-1048-4143-b852-856923148546": 346
            }
          },
          {
            // Index: 5,
            "id": "012d24dd-069d-4dd2-8eda-b6370601456e",
            "cells": {
              "41ecf895-2166-4791-93e5-2f5de0a740ab": "Nigeria",
              "4fe5baf7-e3cf-4d12-bb4f-f2c7afda4023": 224,
              "2c44aa92-1048-4143-b852-856923148546": 354
            }
          },
          {
            // Index: 6,
            "id": "c67afac6-c079-4bf4-a095-b053d3dddcd0",
            "cells": {
              "41ecf895-2166-4791-93e5-2f5de0a740ab": "Brazil",
              "4fe5baf7-e3cf-4d12-bb4f-f2c7afda4023": 215,
              "2c44aa92-1048-4143-b852-856923148546": 2330
            }
          },
          {
            // Index: 7,
            "id": "438b20f9-1d91-4afa-ba65-c242a7691979",
            "cells": {
              "41ecf895-2166-4791-93e5-2f5de0a740ab": "Bangladesh",
              "4fe5baf7-e3cf-4d12-bb4f-f2c7afda4023": 173,
              "2c44aa92-1048-4143-b852-856923148546": 459
            }
          },
          {
            // Index: 8,
            "id": "62723cfb-0d29-440d-a8c5-148960b04192",
            "cells": {
              "41ecf895-2166-4791-93e5-2f5de0a740ab": "Russia",
              "4fe5baf7-e3cf-4d12-bb4f-f2c7afda4023": 144,
              "2c44aa92-1048-4143-b852-856923148546": 2220
            }
          },
          {
            // Index: 9,
            "id": "b9cb1894-f251-4c56-96c2-41309795accb",
            "cells": {
              "41ecf895-2166-4791-93e5-2f5de0a740ab": "Mexico",
              "4fe5baf7-e3cf-4d12-bb4f-f2c7afda4023": 129,
              "2c44aa92-1048-4143-b852-856923148546": 1920
            }
          }
        ],
        "columns": [
          {
            // Index: 0,
            "id": "41ecf895-2166-4791-93e5-2f5de0a740ab",
            "props": {
              "name": "Country",
              "hint": "string"
            }
          },
          {
            // Index: 1,
            "id": "4fe5baf7-e3cf-4d12-bb4f-f2c7afda4023",
            "props": {
              "name": "Population (millions)",
              "hint": "number"
            }
          },
          {
            // Index: 2,
            "id": "2c44aa92-1048-4143-b852-856923148546",
            "props": {
              "name": "GDP (USD, billions)",
              "hint": "number"
            }
          }
        ]
      },
      "created": {
        "userId": "AI Agent",
        "username": "AI Agent",
        "datetime": {
          "ms": 1758595671986
        }
      },
      "changes": []
    },
    {
      // Index: 1,
      "id": "92a298ff-5b38-4165-85eb-c4f603b68cba",
      "x": 357,
      "y": 285.5,
      "rotation": 353,
      "comments": [
        {
          // Index: 0,
          "id": "335755e9-a318-4bc7-94f4-8aaaab8eb1e7",
          "text": "This shape has a comment!",
          "user": {
            "id": "dc8ae028-9ae3-485d-9d26-6a32f3106745.72f988bf-86f1-41af-91ab-2d7cd011db47",
            "name": "Taylor Williams"
          },
          "votes": [],
          "createdAt": {
            "ms": 1758596699419
          }
        }
      ],
      "votes": [],
      "content": {
        "size": 143,
        "color": "#33FF57",
        "type": "triangle"
      },
      "created": {
        "userId": "dc8ae028-9ae3-485d-9d26-6a32f3106745.72f988bf-86f1-41af-91ab-2d7cd011db47",
        "username": "Taylor Williams",
        "datetime": {
          "ms": 1758596070118
        }
      },
      "changes": []
    },
    {
      // Index: 2,
      "id": "911bbdb2-a334-4501-b973-3a1ba6a7b608",
      "x": 787.0298507462685,
      "y": 169.12686567164178,
      "rotation": 6,
      "comments": [],
      "votes": [],
      "content": {
        "size": 157,
        "color": "#FF0000",
        "type": "square"
      },
      "created": {
        "userId": "dc8ae028-9ae3-485d-9d26-6a32f3106745.72f988bf-86f1-41af-91ab-2d7cd011db47",
        "username": "Taylor Williams",
        "datetime": {
          "ms": 1758596070538
        }
      },
      "changes": []
    },
    {
      // Index: 3,
      "id": "158a4a59-4df3-4698-94fa-3116845870f5",
      "x": 712.5,
      "y": 390,
      "rotation": 356,
      "comments": [],
      "votes": [],
      "content": {
        "size": 158,
        "color": "#FF8C33",
        "type": "star"
      },
      "created": {
        "userId": "dc8ae028-9ae3-485d-9d26-6a32f3106745.72f988bf-86f1-41af-91ab-2d7cd011db47",
        "username": "Taylor Williams",
        "datetime": {
          "ms": 1758596071460
        }
      },
      "changes": []
    },
    {
      // Index: 4,
      "id": "1f5a0b33-7479-47e6-9fc5-f722c5b3e7ac",
      "x": 535.5,
      "y": 92,
      "rotation": 346,
      "comments": [],
      "votes": [],
      "content": {
        "size": 150,
        "color": "#3357FF",
        "type": "circle"
      },
      "created": {
        "userId": "dc8ae028-9ae3-485d-9d26-6a32f3106745.72f988bf-86f1-41af-91ab-2d7cd011db47",
        "username": "Taylor Williams",
        "datetime": {
          "ms": 1758596071942
        }
      },
      "changes": []
    },
    {
      // Index: 5,
      "id": "ca1c873f-429a-4ab4-afa2-c817658e1662",
      "x": 560.6940298507462,
      "y": 390.5223880597015,
      "rotation": 8,
      "comments": [],
      "votes": [],
      "content": {
        "size": 144,
        "color": "#33FFF5",
        "type": "circle"
      },
      "created": {
        "userId": "dc8ae028-9ae3-485d-9d26-6a32f3106745.72f988bf-86f1-41af-91ab-2d7cd011db47",
        "username": "Taylor Williams",
        "datetime": {
          "ms": 1758596246644
        }
      },
      "changes": []
    },
    {
      // Index: 6,
      "id": "bd00a101-84a0-4847-b5eb-e76babca8d59",
      "x": -217,
      "y": 471,
      "rotation": 5,
      "comments": [],
      "votes": [],
      "content": {
        "text": "Some text!",
        "color": "#111827",
        "width": 300,
        "fontSize": 16,
        "bold": false,
        "italic": false,
        "underline": false,
        "strikethrough": false,
        "cardStyle": false,
        "textAlign": "left"
      },
      "created": {
        "userId": "AI Agent",
        "username": "AI Agent",
        "datetime": {
          "ms": 1758596308442
        }
      },
      "changes": []
    }
  ],
  "comments": [],
  "inks": [],
  "jobs": {
    // Note: This is a map that has been serialized to JSON. It is not a key-value object/record but is being printed as such.
  }
}
\`\`\`;

EXAMPLES:

1.
User request:
"Make a table containing the largest ten countries by population, their GDP in USD, and their population."

Snippet written to accomplish the edit:

const { root } = context;
// CRITICAL: Create a NEW AI user for this table (don't reuse User objects!)
const aiUser = context.create.User({ id: "AI", name: "AI" });

// Create a new table on the canvas
const tableItem = root.items.createTableItem({ width: 1600, height: 900 }, aiUser);
const table = tableItem.content;

// Clear default columns - delete all columns first
while (table.columns.length > 0) {
  table.deleteColumn(table.columns[0]);
}

// Clear default rows
table.rows.removeRange(0, table.rows.length);

// Add the columns we need: Country, Population (millions), GDP (USD, billions)
table.addColumn();
const colCountry = table.columns[table.columns.length - 1];
colCountry.props.name = "Country";
colCountry.props.hint = "string";

table.addColumn();
const colPopulation = table.columns[table.columns.length - 1];
colPopulation.props.name = "Population (millions)";
colPopulation.props.hint = "number";

table.addColumn();
const colGDP = table.columns[table.columns.length - 1];
colGDP.props.name = "GDP (USD, billions)";
colGDP.props.hint = "number";

// Data for the ten most populous countries (population in millions, GDP in USD billions)
const data = [
  { country: "India", pop: 1429, gdp: 3940 },
  { country: "China", pop: 1412, gdp: 18530 },
  { country: "United States", pop: 334, gdp: 27970 },
  { country: "Indonesia", pop: 278, gdp: 1570 },
  { country: "Pakistan", pop: 241, gdp: 346 },
  { country: "Nigeria", pop: 224, gdp: 354 },
  { country: "Brazil", pop: 215, gdp: 2330 },
  { country: "Bangladesh", pop: 173, gdp: 459 },
  { country: "Russia", pop: 144, gdp: 2220 },
  { country: "Mexico", pop: 129, gdp: 1920 },
];

// Add rows with data
data.forEach(entry => {
  table.addRow();
  const row = table.rows[table.rows.length - 1];
  row.setCell(colCountry, entry.country);
  row.setCell(colPopulation, entry.pop);
  row.setCell(colGDP, entry.gdp);
});

2.
User request: "Add a sticky note that has text that is the average of the colors of all the shapes on the canvas."

Snippet written to accomplish the edit:

const { root } = context;

// Collect all shape colors on the canvas
let rSum = 0, gSum = 0, bSum = 0, count = 0;

root.items.forEach((item) => {
  // Check if this item's content is a Shape
  if (item.content && typeof item.content === 'object' && 'type' in item.content && 'color' in item.content) {
    const color = item.content.color;
    if (typeof color === 'string' && /^#([0-9A-Fa-f]{6})$/.test(color)) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      rSum += r; gSum += g; bSum += b; count += 1;
    }
  }
});

// Compute the average color
let avgHex = '#000000';
if (count > 0) {
  const rAvg = Math.round(rSum / count);
  const gAvg = Math.round(gSum / count);
  const bAvg = Math.round(bSum / count);
  const toHex = (n) => n.toString(16).toUpperCase().padStart(2, '0');
  avgHex = \`#\${toHex(rAvg)}\${toHex(gAvg)}\${toHex(bAvg)}\`;
}

// CRITICAL: Create a NEW AI user for this note
const aiUser = context.create.User({ id: "AI", name: "AI" });
// Create a new sticky note - automatically inserted into items array
const noteItem = root.items.createNoteItem({ width: 1600, height: 900 }, aiUser);
noteItem.content.text = avgHex;

3.
User request: "Create a blue circle"

Snippet written to accomplish the edit:

const { root } = context;
// CRITICAL: Create a NEW AI user for this shape
const aiUser = context.create.User({ id: "AI", name: "AI" });

// Available shape types: 'circle', 'square', 'triangle', 'star', 'rectangle'
// This method automatically inserts the shape into root.items
const shapeItem = root.items.createShapeItem(
  'circle',
  { width: 1600, height: 900 }, // canvas size for positioning
  ['#0000FF'], // array of color options - blue
  true, // filled (true) or outline only (false)
  aiUser
);

4.
User request: "Add a text block that says 'Hello World' in red"

Snippet written to accomplish the edit:

const { root } = context;
// CRITICAL: Create a NEW AI user for this text block
const aiUser = context.create.User({ id: "AI", name: "AI" });

// This method automatically inserts the text into root.items
const textItem = root.items.createTextItem(
  aiUser,
  { width: 1600, height: 900 },
  {
    text: 'Hello World',
    color: '#FF0000', // red text
    fontSize: 24,
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    cardStyle: true, // white card background with shadow
    textAlign: 'center'
  }
);

5.
User request: "Delete all red shapes"

Snippet written to accomplish the edit:

const { root } = context;

// Collect items to delete first (don't modify array while iterating)
const itemsToDelete = [];
root.items.forEach((item) => {
  if (item.content && typeof item.content === 'object' && 'color' in item.content) {
    if (item.content.color === '#FF0000') {
      itemsToDelete.push(item);
    }
  }
});

// Now delete them
itemsToDelete.forEach(item => item.delete());

6.
User request: "Add three circles: red, green, and blue"

Snippet written to accomplish the edit:

const { root } = context;

// CRITICAL: Create a NEW User for EACH circle (don't reuse!)
const aiUser1 = context.create.User({ id: "AI", name: "AI" });
root.items.createShapeItem('circle', { width: 1600, height: 900 }, ['#FF0000'], true, aiUser1);

const aiUser2 = context.create.User({ id: "AI", name: "AI" });
root.items.createShapeItem('circle', { width: 1600, height: 900 }, ['#00FF00'], true, aiUser2);

const aiUser3 = context.create.User({ id: "AI", name: "AI" });
root.items.createShapeItem('circle', { width: 1600, height: 900 }, ['#0000FF'], true, aiUser3);

7.
User request: "Create a group called 'My Ideas'"

Snippet written to accomplish the edit:

const { root } = context;
// CRITICAL: Create a NEW AI user for this group
const aiUser = context.create.User({ id: "AI", name: "AI" });

// Create a new group - it starts empty and items can be added to group.content.items
const groupItem = root.items.createGroupItem('My Ideas', { width: 1600, height: 900 }, aiUser);

8.
User request: "Add a text block"

Snippet written to accomplish the edit:

const { root } = context;
// CRITICAL: Create a NEW AI user for this text block
const aiUser = context.create.User({ id: "AI", name: "AI" });

// Create a text block with default properties (blank text, default color, width, font size)
const textBlockItem = root.items.createTextBlockItem({ width: 1600, height: 900 }, aiUser);
// Optionally customize it
textBlockItem.content.text = 'Enter text here';
textBlockItem.content.fontSize = 18;
textBlockItem.content.bold = true;

9.
User request: "Collect the supporting files I want to send to the AI"

Snippet written to accomplish the edit:

const { root } = context;
// CRITICAL: Create a NEW AI user for this reference card
const aiUser = context.create.User({ id: "AI", name: "AI" });

// Create a file reference card with initial links (only the titles render on the canvas)
const referenceItem = root.items.createFileReferenceCardItem(
  { width: 1600, height: 900 },
  aiUser,
  [
    { title: "Design Spec", url: "https://contoso.sharepoint.com/design.pdf" },
    { title: "Metrics Dashboard", url: "https://contoso.powerbi.com/reports/123" },
  ]
);

// Add another link later if needed
referenceItem.content.addReference(
  "Customer interview notes",
  "https://contoso.sharepoint.com/interviews.docx"
);

IMPORTANT:

Creating Items (all methods automatically add items to root.items array):
- Methods available on root.items to create different types of items
- All createXxxItem() methods automatically insert the item into the items array
- DO NOT call insertAtEnd() or insertAt() after using create methods!

CRITICAL: All item creation methods require a User parameter.
CRITICAL: Remember to create a NEW User object for each item created (see examples above).

CRITICAL CONSTRAINTS:
1. ALWAYS create a NEW synthetic AI user for EACH item you create:
   const aiUser = context.create.User({ id: "AI", name: "AI" });
   DO NOT reuse User objects - create a fresh one for each createXxxItem() call.
   Each User can only be inserted once (as createdBy), so if creating multiple items, create multiple Users.
2. DO NOT use 'await', 'async', or any asynchronous patterns - all operations are synchronous
3. DO NOT manually insert items after using createXxxItem() methods - they already insert automatically
4. THE SAME NODE/OBJECT INSTANCE CANNOT BE INSERTED INTO THE TREE MORE THAN ONCE
   - If you remove an item/node from the tree, you CANNOT re-insert that exact same object
   - Instead, you must create a NEW instance with the same properties (clone it)
   - Example: To move an item, use duplicateItem() then delete the original
   - Example: To reuse data, create new objects with the same values, don't reuse variables
   - THIS APPLIES TO USER OBJECTS TOO - create a new one for each item
5. When modifying tables, use row.setCell(column, value) with actual column objects
6. Coordinates can be negative - the canvas is infinite
7. DO NOT use Tree.runTransaction() - it's not needed and causes errors with await
8. Check item.content type before accessing type-specific properties
9. Once an object is inserted into the tree, it becomes "attached" - you cannot insert it elsewhere

WRONG - Reusing the same User object across multiple items:
  const { root } = context;
  const aiUser = context.create.User({ id: "AI", name: "AI" });
  const item1 = root.items.createNoteItem({ width: 1600, height: 900 }, aiUser);
  const item2 = root.items.createShapeItem('circle', { width: 1600, height: 900 }, ['#FF0000'], true, aiUser); // ERROR!

CORRECT - Create a NEW User for each item:
  const { root } = context;
  const aiUser1 = context.create.User({ id: "AI", name: "AI" });
  const item1 = root.items.createNoteItem({ width: 1600, height: 900 }, aiUser1);
  const aiUser2 = context.create.User({ id: "AI", name: "AI" });
  const item2 = root.items.createShapeItem('circle', { width: 1600, height: 900 }, ['#FF0000'], true, aiUser2);

WRONG - Using context.user directly (will cause schema error):
  const { root, user } = context;
  const noteItem = root.items.createNoteItem({ width: 1600, height: 900 }, user);  // ERROR

CORRECT - Create synthetic AI user in current tree context first:
  const { root } = context;
  const aiUser = context.create.User({ id: "AI", name: "AI" });
  const noteItem = root.items.createNoteItem({ width: 1600, height: 900 }, aiUser);

WRONG - Using await (will cause SyntaxError):
  await tree.runTransaction(async () => { ... });  // ERROR: await not allowed

CORRECT - Direct synchronous operations:
  const noteItem = root.items.createNoteItem({ width: 1600, height: 900 }, user);
  noteItem.content.text = 'My note text';

WRONG - Manually inserting after create method:
  const noteItem = root.items.createNoteItem({ width: 1600, height: 900 }, user);
  root.items.insertAtEnd(noteItem);  // ERROR: already inserted!

CORRECT - Create methods handle insertion:
  const noteItem = root.items.createNoteItem({ width: 1600, height: 900 }, user);
  // Item is already in the tree, just modify its properties
  noteItem.x = 100;
  noteItem.y = 200;

WRONG - Trying to reuse the same shape object:
  const shape = new Shape({ color: '#FF0000', type: new Circle({ radius: 50 }), filled: true });
  const item1 = new Item({ ..., content: shape }); // shape is now attached
  const item2 = new Item({ ..., content: shape }); // ERROR: shape already attached!

CORRECT - Create separate instances:
  const item1 = new Item({ ..., content: new Shape({ color: '#FF0000', type: new Circle({ radius: 50 }), filled: true }) });
  const item2 = new Item({ ..., content: new Shape({ color: '#FF0000', type: new Circle({ radius: 50 }), filled: true }) });

WRONG - Trying to move by removing and re-inserting:
  const item = root.items[0];
  root.items.removeAt(0);
  root.items.insertAtEnd(item); // ERROR: item was already in tree

CORRECT - Use duplicate then delete, or just modify properties in place:
  const item = root.items[0];
  const duplicate = root.items.duplicateItem(item, user, { width: 1600, height: 900 });
  item.delete();
  // Or better: just modify the item's x, y properties directly without moving it

When responding to the user, YOU MUST NEVER reference technical details like "schema", "tree", or "data structure" - explain what has happened with high-level user-friendly language. Focus on the user-visible results like "I created a blue circle" not "I added a Shape node with Circle type to the tree".
`;
