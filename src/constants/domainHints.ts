export const domainHints = `This is a 2D application that allows the user to position shapes on a canvas.
The shapes can be moved, rotated, resized and have style properties changed.
Each shape can have comments associated with it as well.

Here's an example of a canvas with five shapes on it:

\`\`\`JSON
{
  "items": [
    {
      // Index: 0,
      "id": "c0115f64-c0c0-4248-b23d-4b66b5df5917",
      "x": 1123,
      "y": 575,
      "rotation": 352,
      "comments": [],
      "votes": {
        "votes": []
      },
      "content": {
        "size": 118,
        "color": "#A133FF",
        "type": "star"
      }
    },
    {
      // Index: 1,
      "id": "c0115f64-c0c0-4248-b23d-4b66b5df5919",
      "x": 692,
      "y": 231,
      "rotation": 357,
      "comments": [],
      "votes": {
        "votes": []
      },
      "content": {
        "size": 111,
        "color": "#FF3357",
        "type": "triangle"
      }
    },
    {
      // Index: 2,
      "id": "c0115f64-c0c0-4248-b23d-4b66b5df591b",
      "x": 1228,
      "y": 85,
      "rotation": 12,
      "comments": [],
      "votes": {
        "votes": []
      },
      "content": {
        "size": 110,
        "color": "#FF5733",
        "type": "square"
      }
    },
    {
      // Index: 3,
      "id": "c0115f64-c0c0-4248-b23d-4b66b5df591d",
      "x": 228,
      "y": 199,
      "rotation": 353,
      "comments": [],
      "votes": {
        "votes": []
      },
      "content": {
        "size": 111,
        "color": "#3357FF",
        "type": "star"
      }
    },
    {
      // Index: 4,
      "id": "c0115f64-c0c0-4248-b23d-4b66b5df591f",
      "x": 588,
      "y": 699,
      "rotation": 355,
      "comments": [],
      "votes": {
        "votes": []
      },
      "content": {
        "size": 105,
        "color": "#FF5733",
        "type": "star"
      }
    }
  ],
  "comments": []
}
\`\`\`;

Here's an example of a function that can be run by the tree editing tool which adds three now shapes to the canvas, groups items on the canvas by shape type and organizes them spatially, and then colors all shapes red:

function editTree({ root, create }) {
  // Add three new shapes: a star, a triangle, and a circle
  const newStar = create.Item({
    id: crypto.randomUUID(),
    x: 100,
    y: 400,
    rotation: 0,
    comments: [],
    votes: create.Vote({ votes: [] }),
    content: create.Shape({ size: 110, color: "#FF0000", type: "star" })
  });
  const newTriangle = create.Item({
    id: crypto.randomUUID(),
    x: 400,
    y: 100,
    rotation: 0,
    comments: [],
    votes: create.Vote({ votes: [] }),
    content: create.Shape({ size: 110, color: "#FF0000", type: "triangle" })
  });
  const newCircle = create.Item({
    id: crypto.randomUUID(),
    x: 400,
    y: 400,
    rotation: 0,
    comments: [],
    votes: create.Vote({ votes: [] }),
    content: create.Shape({ size: 110, color: "#FF0000", type: "circle" })
  });
  // Insert the new shapes at the end of the canvas
  root.items.insertAt(root.items.length, newStar, newTriangle, newCircle);

  // Group all shapes spatially by type and make them red
  root.items.forEach(item => {
    // Color everything red
    if (item.content && item.content.color !== undefined) {
      item.content.color = "#FF0000";
    }
    // Position by shape type
    switch (item.content.type) {
	  case "square":
		item.x = 100;
		item.y = 100;
		break;
      case "star":
        item.x = 100;
		item.y = 400;
        break;
      case "triangle":
        item.x = 400;
		item.y = 100;
        break;
      case "circle":
        item.x = 400;
		item.y = 400;
        break;
    }
  });

  // Spread the shapes in each group out a bit so they are more visible
  root.items.forEach(item => {
      item.x += Math.random() * 50 - 25;
	  item.y += Math.random() * 50 - 25;
  });
}

A common mistake in the generated function: data cannot be removed from the tree and then directly re-inserted. Instead, it must be cloned - i.e. create an equivalent new instance of that data - and then the new instance can be inserted.

When responding to the user, YOU MUST NEVER reference technical details like "schema" or "data", "tree" or "pixels" - explain what has happened with high-level user-friendly language.
`;
