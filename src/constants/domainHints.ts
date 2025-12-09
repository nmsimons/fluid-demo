export const domainHints = `Collaborative 2D canvas: shapes, notes, text blocks, tables, groups on an infinite plane, plus ink strokes. Items can move, rotate, resize, style, and carry comments/votes.

HOW TO CODE
- Synchronous only; no async/await/modules. Runs via new Function.
- Create a NEW synthetic user for EVERY item: const aiUser = context.create.User({ id: "AI", name: "AI" }); never reuse a User instance.
- createXxxItem already inserts into root.items; do NOT insert again.
- Ink methods do NOT need a user.
- Context: { root, tree, user }. root holds items/comments/inks; tree is advanced view; user is current user (do not pass directly to createXxxItem).

DATA MODEL (root)
- items: array of Item (Shape | Note | TextBlock | FluidTable | Group)
- comments: canvas-level comments
- inks: ink strokes

ARRAY USAGE
- Read like arrays: length, forEach, at(), indexing.
- SharedTree array APIs: insertAt(index, item), insertAtEnd(item), removeAt(index), removeRange(start, count), indexOf(item), findIndex(cb), at(i), forEach(cb), length.
- Mutate with provided methods, not manual inserts: createXxxItem() adds; item.delete() removes; table.addRow()/deleteRow()/addColumn()/deleteColumn(); rows/columns support removeRange().
- Never reuse attached objects when re-adding; create fresh instances.
- Do not reuse attached objects when re-adding (create fresh instead).
- Moves keep the same item identity: moveToIndex(gap, sourceIndex[, sourceArray]), moveToStart/End, moveRangeToIndex/start/end. Gaps are between items before the move: for [A,B,C], gaps are 0(^A),1(A|B),2(B|C),3(C^). To move A after B: moveToIndex(2, indexOfA). For swaps, moveToIndex(indexOfA, indexOfB).

Item fields: id, x, y, rotation, createdBy/At, updatedBy/At, comments, votes, connections, content.
Content: Shape (circle|square|triangle|star|rectangle, color(s), size, filled), Note (text, bg color), TextBlock (rich text: color/font/align/card), FluidTable (rows, columns, typed cells), Group (name, optional grid, nested items).

ALLOWED COLORS
- Notes: #FEFF68, #FFE4A7, #C8F7C5, #FAD4D8, #D7E8FF.
- Shapes: #000000, #FFFFFF, #FF0000, #33FF57, #3357FF, #FF33A1, #A133FF, #33FFF5, #F5FF33, #FF8C33.
- Text: #111827, #4B5563, #9CA3AF, #FFFFFF, #EF4444, #F59E0B, #10B981, #3B82F6, #6366F1, #A855F7, #EC4899.

INK VS SHAPES
- Geometric (circle, square, triangle, star, rectangle) → root.items.createShapeItem.
- Freehand/artistic (faces, maps, doodles, connectors, highlights) → root.inks helpers.
- Ink helpers: createFreeformPath(points, color, width); createArrow(startX, startY, endX, endY, color, width, headLength); createHighlight(x, y, itemWidth, color, width, wavy); deleteByColor(color); deleteAll().
- Ink stroke shape: id, points[{x,y,t?,p?}], style{strokeColor,strokeWidth,opacity,lineCap,lineJoin}, bbox{x,y,w,h}.

CAPABILITIES
- Create/duplicate/delete items (always new User per item).
- Modify item props (position, rotation, style, text, z-order, connections, nesting).
- Add/remove comments and votes.
- Tables: add/remove rows/cols; row.setCell(column, value) with column objects.
- Query/analyze canvas state.

CONSTRAINTS (must follow)
1) New User per item; each User can be inserted once. For multiple items: create multiple Users.
2) No async/await. All sync.
3) Do not manually insert after createXxxItem.
4) Never reuse an attached object (item/content/user). To reuse, create a fresh instance or duplicate then delete original.
5) Coordinates may be negative.
6) Do not use Tree.runTransaction.
7) Check content type before accessing type-specific props.
8) Ink is separate from items.

QUICK USAGE (correct vs wrong)
- Correct: const aiUser = context.create.User({ id: "AI", name: "AI" }); const note = root.items.createNoteItem({ width: 1600, height: 900 }, aiUser);
- Wrong: reuse same aiUser across multiple createXxxItem calls.
- Wrong: root.items.insertAtEnd(noteItem) after create.
- Wrong: using context.user directly in createXxxItem.
- Wrong: await tree.runTransaction(async () => {}).

SHORT EXAMPLES
1) Table (top 10 population/GDP)
const { root } = context; const aiUser = context.create.User({ id: "AI", name: "AI" });
const tableItem = root.items.createTableItem({ width: 1600, height: 900 }, aiUser);
const table = tableItem.content;
while (table.columns.length) table.deleteColumn(table.columns[0]);
table.rows.removeRange(0, table.rows.length);
['Country','Population (millions)','GDP (USD, billions)'].forEach((name, i) => {
  table.addColumn(); const c = table.columns.at(-1); c.props.name = name; c.props.hint = i === 0 ? 'string' : 'number';
});
const data = [
  { country: 'India', pop: 1429, gdp: 3940 },
  { country: 'China', pop: 1412, gdp: 18530 },
  { country: 'United States', pop: 334, gdp: 27970 },
  { country: 'Indonesia', pop: 278, gdp: 1570 },
  { country: 'Pakistan', pop: 241, gdp: 346 },
  { country: 'Nigeria', pop: 224, gdp: 354 },
  { country: 'Brazil', pop: 215, gdp: 2330 },
  { country: 'Bangladesh', pop: 173, gdp: 459 },
  { country: 'Russia', pop: 144, gdp: 2220 },
  { country: 'Mexico', pop: 129, gdp: 1920 },
];
data.forEach(({ country, pop, gdp }) => {
  table.addRow(); const r = table.rows.at(-1); const [c0, c1, c2] = table.columns; r.setCell(c0, country); r.setCell(c1, pop); r.setCell(c2, gdp);
});

2) Average shape color note
const { root } = context; let r=0,g=0,b=0,count=0;
root.items.forEach(item => {
  if (item.content && 'type' in item.content && 'color' in item.content && /^#([0-9A-Fa-f]{6})$/.test(item.content.color)) {
    const c = item.content.color; r += parseInt(c.slice(1,3),16); g += parseInt(c.slice(3,5),16); b += parseInt(c.slice(5,7),16); count++;
  }
});
const toHex = n => n.toString(16).toUpperCase().padStart(2,'0');
const avg = count
  ? '#' + toHex(Math.round(r/count)) + toHex(Math.round(g/count)) + toHex(Math.round(b/count))
  : '#000000';
const aiUser = context.create.User({ id: "AI", name: "AI" });
const note = root.items.createNoteItem({ width: 1600, height: 900 }, aiUser); note.content.text = avg;

3) Blue circle
const { root } = context; const aiUser = context.create.User({ id: "AI", name: "AI" });
root.items.createShapeItem('circle', { width: 1600, height: 900 }, ['#0000FF'], true, aiUser);

4) Red text block
const { root } = context; const aiUser = context.create.User({ id: "AI", name: "AI" });
root.items.createTextItem(aiUser, { width: 1600, height: 900 }, { text: 'Hello World', color: '#FF0000', fontSize: 24, bold: false, italic: false, underline: false, strikethrough: false, cardStyle: true, textAlign: 'center' });

5) Delete red shapes
const { root } = context; const toDelete = [];
root.items.forEach(item => { if (item.content && 'color' in item.content && item.content.color === '#FF0000') toDelete.push(item); });
toDelete.forEach(item => item.delete());

6) Three circles (new user each)
const { root } = context;
['#FF0000','#00FF00','#0000FF'].forEach(color => {
  const u = context.create.User({ id: "AI", name: "AI" });
  root.items.createShapeItem('circle', { width: 1600, height: 900 }, [color], true, u);
});

7) Group "My Ideas"
const { root } = context; const aiUser = context.create.User({ id: "AI", name: "AI" });
root.items.createGroupItem('My Ideas', { width: 1600, height: 900 }, aiUser);

8) Text block (default then tweak)
const { root } = context; const aiUser = context.create.User({ id: "AI", name: "AI" });
const tb = root.items.createTextBlockItem({ width: 1600, height: 900 }, aiUser); tb.content.text = 'Enter text here'; tb.content.fontSize = 18; tb.content.bold = true;

9) File reference card
const { root } = context; const aiUser = context.create.User({ id: "AI", name: "AI" });
const card = root.items.createFileReferenceCardItem({ width: 1600, height: 900 }, aiUser, [
  { title: 'Design Spec', url: 'https://contoso.sharepoint.com/design.pdf' },
  { title: 'Metrics Dashboard', url: 'https://contoso.powerbi.com/reports/123' },
]);
card.content.addReference('Customer interview notes', 'https://contoso.sharepoint.com/interviews.docx');

10) Red arrow table → circle
const { root } = context; let tableItem=null, circleItem=null;
root.items.forEach(item => { if (item.content && 'rows' in item.content) tableItem=item; if (item.content && item.content.type==='circle') circleItem=item; });
if (tableItem && circleItem) {
  const tableX = tableItem.x + 200, tableY = tableItem.y + 100; root.inks.createArrow(tableX, tableY, circleItem.x, circleItem.y, '#FF0000', 4);
}

11) Smiley face (ink)
const { root } = context; const cx=400, cy=300, r=80; const face=[]; for (let i=0;i<=32;i++){const a=(i/32)*Math.PI*2; face.push({x:cx+r*Math.cos(a), y:cy+r*Math.sin(a)});} root.inks.createFreeformPath(face, '#FFD700', 4);
root.inks.createFreeformPath([{ x: cx-25, y: cy-20 }, { x: cx-25, y: cy-10 }], '#000', 6);
root.inks.createFreeformPath([{ x: cx+25, y: cy-20 }, { x: cx+25, y: cy-10 }], '#000', 6);
const smile=[]; for (let i=0;i<=16;i++){const a=(i/16)*Math.PI; smile.push({ x: cx+40*Math.cos(a), y: cy+20+25*Math.sin(a) });} root.inks.createFreeformPath(smile, '#000', 4);

12) Yellow highlight under first note
const { root } = context; let note=null; root.items.forEach(item => { if (!note && item.content && 'text' in item.content && !('fontSize' in item.content)) note=item; });
if (note) root.inks.createHighlight(note.x, note.y + 150, 200, '#FFFF00', 8, false);

13) Map path A → B (ink)
const { root } = context; const sx=100, sy=200; const endX = sx + 350;
root.inks.createFreeformPath([
  { x: sx, y: sy }, { x: sx + 50, y: sy - 30 }, { x: sx + 100, y: sy + 20 },
  { x: sx + 150, y: sy - 10 }, { x: sx + 200, y: sy + 40 }, { x: sx + 280, y: sy + 30 },
  { x: sx + 350, y: sy }
], '#8B4513', 3);
root.inks.createFreeformPath([{ x: sx - 10, y: sy + 30 }, { x: sx, y: sy + 10 }, { x: sx + 10, y: sy + 30 }], '#FF0000', 4);
root.inks.createFreeformPath([{ x: endX - 15, y: sy - 15 }, { x: endX + 15, y: sy + 15 }], '#FF0000', 4);
root.inks.createFreeformPath([{ x: endX + 15, y: sy - 15 }, { x: endX - 15, y: sy + 15 }], '#FF0000', 4);

14) Delete all red ink
const { root } = context; root.inks.deleteByColor('#FF0000');

15) Clear all ink
const { root } = context; root.inks.deleteAll();

16) Simple house (ink)
const { root } = context; const bx=300, by=400;
root.inks.createFreeformPath([{ x: bx, y: by }, { x: bx + 120, y: by }, { x: bx + 120, y: by - 80 }, { x: bx, y: by - 80 }, { x: bx, y: by }], '#8B4513', 3);
root.inks.createFreeformPath([{ x: bx - 10, y: by - 80 }, { x: bx + 60, y: by - 140 }, { x: bx + 130, y: by - 80 }], '#A0522D', 3);
root.inks.createFreeformPath([{ x: bx + 45, y: by }, { x: bx + 45, y: by - 50 }, { x: bx + 75, y: by - 50 }, { x: bx + 75, y: by }], '#4A3728', 2);
root.inks.createFreeformPath([{ x: bx + 15, y: by - 30 }, { x: bx + 15, y: by - 55 }, { x: bx + 35, y: by - 55 }, { x: bx + 35, y: by - 30 }, { x: bx + 15, y: by - 30 }], '#87CEEB', 2);

USER-FACING RESPONSES
- Describe visible results only (e.g., "Created a blue circle"), never internal schema/tree terminology.
`;
