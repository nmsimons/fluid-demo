export const domainHints = `This is a 2D application that allows the user to position shapes, notes, and tables on a canvas.
The canvas also supports ink. The shapes can be moved, rotated, resized and have style properties changed.
Each shape, note, and table can have comments associated with it as well.

Here's an example of a canvas with five shapes on it:

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
          "userId": "dc8ae028-9ae3-485d-9d26-6a32f3106745.72f988bf-86f1-41af-91ab-2d7cd011db47",
          "username": "Taylor Williams",
          "votes": {
            "votes": []
          },
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
          "userId": "dc8ae028-9ae3-485d-9d26-6a32f3106745.72f988bf-86f1-41af-91ab-2d7cd011db47",
          "username": "Taylor Williams",
          "votes": {
            "votes": []
          },
          "createdAt": {
            "ms": 1758596699419
          }
        }
      ],
      "votes": {
        "votes": []
      },
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
      "votes": {
        "votes": []
      },
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
      "votes": {
        "votes": []
      },
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
      "votes": {
        "votes": []
      },
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
      "votes": {
        "votes": []
      },
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
      "votes": {
        "votes": []
      },
      "content": {
        "id": "b04e432f-3e2c-45cb-add9-6ea0f962f5b1",
        "text": "Some text!",
        "author": "AI Agent"
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

Function written to accomplish the edit:

function editTree({ root, create }) {
  // Create a new table on the canvas
  const tableItem = root.items.createTableItem({ width: 1600, height: 900 }, "AI Agent", "AI Agent");
  const table = tableItem.content;

  // Remove any default rows
  if (table.rows && typeof table.rows.removeRange === 'function') {
    table.rows.removeRange(0, table.rows.length);
  }

  // Remove any default columns using the provided API
  if (table.columns) {
    // Delete columns from first to last
    while (table.columns.length > 0) {
      table.deleteColumn(table.columns[0]);
    }
  }

  // Add the columns we need: Country, Population (millions), GDP (USD, billions)
  table.addColumn("AI Agent");
  let colCountry = table.columns[table.columns.length - 1];
  colCountry.props.name = "Country";
  colCountry.props.hint = "string";

  table.addColumn("AI Agent");
  let colPopulation = table.columns[table.columns.length - 1];
  colPopulation.props.name = "Population (millions)";
  colPopulation.props.hint = "number";

  table.addColumn("AI Agent");
  let colGDP = table.columns[table.columns.length - 1];
  colGDP.props.name = "GDP (USD, billions)";
  colGDP.props.hint = "number";

  const countryColId = colCountry.id;
  const popColId = colPopulation.id;
  const gdpColId = colGDP.id;

  // Data for the ten most populous countries (population in millions, GDP in USD billions; recent estimates)
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

  data.forEach(entry => {
    table.addRow("AI Agent");
    const row = table.rows[table.rows.length - 1];
    if (countryColId) row.cells[countryColId] = entry.country;
    if (popColId) row.cells[popColId] = entry.pop;
    if (gdpColId) row.cells[gdpColId] = entry.gdp;
  });
}

2.
User request: "Add a sticky note that has text that is the average of the colors of all the shapes on the canvas."

Function written to accomplish the edit:

function editTree({ root, create }) {
  // Collect all shape colors on the canvas
  const shapeTypes = new Set(['circle', 'square', 'triangle', 'star']);
  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  root.items.forEach((item) => {
    const content = item && item.content;
    if (content && typeof content === 'object' && typeof content.type === 'string' && shapeTypes.has(content.type)) {
      const color = content.color;
      if (typeof color === 'string' && /^#([0-9A-Fa-f]{6})$/.test(color)) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        rSum += r; gSum += g; bSum += b; count += 1;
      }
    }
  });

  // Compute the average color (rounded to nearest integer per channel)
  let avgHex = '#000000';
  if (count > 0) {
    const rAvg = Math.round(rSum / count);
    const gAvg = Math.round(gSum / count);
    const bAvg = Math.round(bSum / count);
    const toHex = (n) => n.toString(16).toUpperCase().padStart(2, '0');
    avgHex = \`#\${toHex(rAvg)}\${toHex(gAvg)}\${toHex(bAvg)}\`;
  }

  // Create a new sticky note and set its text to the average color hex string
  const noteItem = root.items.createNoteItem({ width: 1600, height: 900 }, 'AI Agent', 'AI Agent', 'AI Agent');
  if (noteItem && noteItem.content && typeof noteItem.content === 'object') {
    noteItem.content.text = avgHex;
  }
}

A common mistake in the generated function: data cannot be removed from the tree and then directly re-inserted. Instead, it must be cloned - i.e. create an equivalent new instance of that data - and then the new instance can be inserted.

When responding to the user, YOU MUST NEVER reference technical details like "schema" or "data", "tree" or "pixels" - explain what has happened with high-level user-friendly language.
`;
