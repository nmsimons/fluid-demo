# Collaborative Canvas and Table Demo

This application demonstrates the power of the Fluid Framework by building a collaborative canvas and data table application. Users can work together in real-time to create, edit, and interact with shapes, sticky notes, tables, and comments.

## Features

### Collaborative Canvas

- **Shapes**: Create and manipulate circles, squares, triangles, and stars with different colors and sizes
- **Sticky Notes**: Add collaborative text notes that can be edited by multiple users
- **Tables**: Create data tables with different column types (string, number, boolean, date, vote)
- **Real-time Collaboration**: See other users' selections, edits, and presence indicators in real-time
- **Drag & Drop**: Move items around the canvas with live position updates
- **Rotation & Resize**: Transform shapes with real-time preview for other users
- **Layering**: Manage z-order with bring-to-front, send-to-back operations

### Advanced Presence & Selection (Fluid Presence API)

- **Multi-user Selection**: Visual indicators showing which users have selected which items (ephemeral state)
- **User-specific Badges**: Each user gets a unique color and initials badge for real-time identification
- **Collapsible Selection UI**: When multiple users select the same item, see a count badge that expands to show individual users
- **Real-time Awareness**: See where other users are working without cluttering persistent data

### Collaborative Data Tables

- **Multiple Column Types**: String, number, boolean, date, and voting columns
- **Row/Column Operations**: Add, delete, move, and reorder table elements
- **Cell-level Collaboration**: Multiple users can edit different cells simultaneously
- **Table Selection**: Select and manipulate rows, columns, or individual cells
- **Sorting & Filtering**: Interactive table operations with real-time sync

### Comments & Voting

- **Item Comments**: Add threaded comments to any canvas item
- **Voting System**: Vote on comments and items with real-time vote counts
- **User Attribution**: All comments and votes are attributed to specific users

## Setting up the Fluid Framework

This app is designed to use
[Azure Fluid Relay](https://aka.ms/azurefluidrelay) a Fluid relay service offered by Microsoft. You can also run a local service for development purposes. Instructions on how to set up a Fluid relay are on the [Fluid Framework website](https://aka.ms/fluid).

To use AzureClient's local mode, you first need to start a local server.

```bash
npm run start:server
```

Running this command from your terminal window will launch the Azure Fluid Relay local server. Once the server is started, you can run your application against the local service.

```bash
npm run start
```

This command starts the webpack development server, which will make the application available at [http://localhost:8080/](http://localhost:8080/).

One important note is that you will need to use a token provider or, purely for testing and development, use the insecure token provider. There are instructions on how to set this up on the [Fluid Framework website](https://aka.ms/fluid).

All the code required to set up the Fluid Framework and SharedTree data structure is in the infra folder. Most of this code will be the same for any app.

## Schema Definition

The application uses a comprehensive SharedTree schema defined in the `src/schema/` folder:

- **`app_schema.ts`**: Main schema definitions including:
    - `Shape`: Geometric shapes (circle, square, triangle, star) with size, color, and type
    - `Note`: Text-based sticky notes with authorship
    - `FluidTable`: Collaborative tables with multiple column types
    - `Item`: Canvas items that can contain shapes, notes, or tables
    - `Vote`: Voting system for comments and items
    - `Comment`: Threaded comments with user attribution
    - `DateTime`: Date/time values for timestamps
- **`container_schema.ts`**: Fluid container configuration
- **`table_schema.ts`**: Extended table functionality and column definitions

The schema supports rich data types including strings, numbers, booleans, dates, and custom voting objects. All schema changes are automatically synchronized across all connected clients.

## Working with Data

The application leverages two key Fluid Framework technologies for real-time collaborative data management:

### SharedTree for Data Synchronization

- **Persistent Data**: All application data (shapes, notes, tables, comments) is stored in SharedTree
- **Automatic Synchronization**: Data changes are automatically synchronized across all clients
- **Transactional Operations**: Uses `Tree.runTransaction()` to ensure data consistency
- **Tree Events**: UI updates are driven by tree change events for optimal performance
- **Type Safety**: Strongly-typed schema ensures data integrity

### Presence API for Real-time Collaboration

The **Fluid Framework Presence API** is a separate system from SharedTree that handles ephemeral, real-time user interactions. This implementation wraps a sophisticated **signal-based state management system** into an easy-to-use API with custom helpers for optimal performance and developer experience.

#### Core Architecture & Benefits

**Signal-Based State Management:**

- **Optimized WebSocket Usage**: Manages signals automatically to prevent unintended flooding of the WebSocket endpoint
- **Efficient Updates**: Only sends necessary state changes, reducing network overhead
- **Smart Batching**: Groups related updates to minimize communication costs

**Automatic State Synchronization:**

- **New Client Onboarding**: When clients join, they automatically receive current presence state without querying persistent data
- **Clean Disconnections**: When clients leave, their presence state is automatically cleaned up across all remaining clients
- **Always Up-to-Date**: Every client maintains consistent presence state without relying on SharedTree persistence

#### Selection Management

- **Multi-user Selection**: Tracks which users have selected which canvas items or table elements
- **Selection Indicators**: Visual badges showing user initials and colors for each selection
- **Collapsible UI**: When multiple users select the same item, shows a count badge that expands to individual user badges

#### Real-time Operations

- **Drag & Drop Preview**: Shows live position updates as users drag items around the canvas
- **Rotation Preview**: Real-time rotation feedback during shape manipulation
- **Resize Operations**: Live resize preview with immediate visual feedback
- **User Cursors**: Track and display where other users are actively working

#### User Identity & State

- **User Profiles**: Manages user information (names, IDs, avatars)
- **Color Assignment**: Consistent color coding for each user across all presence indicators
- **Connection Status**: Tracks which users are currently connected and active

#### Implementation in This App

The presence system is implemented through several key components with custom helper utilities for simplified usage:

**Core Managers:**

- **`PresenceManager<T>`**: Generic presence manager for different interaction types
- **`SelectionManager<T>`**: Handles multi-user selection state with signal optimization
- **`DragManager`**: Manages real-time drag and rotation operations
- **`ResizeManager`**: Handles collaborative shape resizing with live preview
- **`UsersManager`**: Tracks connected users and their profiles

**Helper Utilities:**

- **`usePresenceManager` Hook**: React hook that simplifies presence subscriptions and automatic cleanup
- **Signal Optimization**: Built-in batching and debouncing to prevent WebSocket flooding
- **State Reconciliation**: Automatic handling of client join/leave scenarios
- **Type-Safe APIs**: Strongly-typed interfaces for all presence operations

This architecture ensures optimal performance while providing a developer-friendly API that abstracts away the complexity of signal management and state synchronization.

Unlike SharedTree data (which persists), presence data is ephemeral and only exists while users are actively connected and interacting.

## Architecture Overview

This application demonstrates a dual-layer architecture using two distinct Fluid Framework systems:

### Layer 1: Persistent Data (SharedTree)

- **Purpose**: Stores and synchronizes all persistent application data
- **Data Types**: Shapes, notes, tables, comments, votes, user-generated content
- **Persistence**: Data survives user disconnections and browser refreshes
- **Synchronization**: Changes are persisted to the Fluid service and synchronized to all clients
- **Use Cases**: Creating shapes, editing notes, adding table rows, posting comments

### Layer 2: Ephemeral Collaboration (Presence API)

- **Purpose**: Handles real-time, temporary user interactions and awareness using signal-based state management
- **Data Types**: Selection state, cursor positions, drag operations, user status
- **Persistence**: Data is lost when users disconnect (intentionally ephemeral)
- **Synchronization**: Real-time broadcasts to active clients only, with optimized signal management
- **Use Cases**: Showing who's selecting what, live drag preview, user avatars/status

**Signal-Based Optimizations:**

- **WebSocket Efficiency**: Prevents flooding by managing signal frequency and batching updates
- **Automatic State Management**: New clients receive current state instantly without database queries
- **Clean Resource Management**: Disconnected clients are automatically cleaned up from all remaining clients

This separation allows for:

- **Optimal Performance**: Presence data doesn't clutter persistent storage and signals are optimized for minimal network usage
- **Privacy**: Temporary interactions aren't permanently recorded
- **Scalability**: Ephemeral data automatically cleans up when users leave, with efficient signal management
- **User Experience**: Immediate feedback without waiting for data persistence, with smart batching for smooth interactions
- **Developer Efficiency**: Simple APIs abstract complex signal management and state synchronization

### Data Operations

- **CRUD Operations**: Create, read, update, and delete operations on all data types
- **Undo/Redo**: Transaction-based undo/redo functionality
- **Bulk Operations**: Add multiple table rows, duplicate items
- **Data Validation**: Type-safe operations with runtime validation

### Performance Optimizations

- **Virtual Scrolling**: Efficient rendering of large tables
- **Incremental Updates**: Only re-render changed components
- **Event Batching**: Optimized event handling for smooth collaboration

The application follows Fluid Framework best practices by treating the SharedTree as the single source of truth and using tree events to update the UI reactively.

## User Interface

The application is built with modern React and features a rich, interactive UI:

### Technology Stack

- **React 18**: Modern React with hooks and contexts
- **Fluent UI**: Microsoft's design system for consistent UX
- **Tailwind CSS**: Utility-first CSS framework for styling
- **TanStack Table**: Advanced table functionality with virtual scrolling
- **TanStack Virtual**: Efficient virtualization for large datasets

### Key UI Components

- **Canvas**: Interactive workspace for shapes, notes, and tables
- **Toolbar**: Context-sensitive tools and actions
- **Property Panels**: Edit item properties and configurations
- **Comments Pane**: Threaded comments with voting
- **Table Views**: Rich data table interfaces with sorting and filtering
- **Selection Indicators**: Multi-user selection visualization

### Responsive Design

- **Adaptive Layout**: Works on desktop and tablet devices
- **Zoom Support**: Canvas zoom and pan functionality
- **Touch Support**: Touch-friendly interactions
- **Keyboard Shortcuts**: Efficient keyboard navigation

### Accessibility

- **Screen Reader Support**: ARIA labels and semantic markup
- **Keyboard Navigation**: Full keyboard accessibility
- **High Contrast**: Support for high contrast themes
- **Focus Management**: Clear focus indicators

To update styles, run the Tailwind CSS watcher:

```bash
npx tailwindcss -i ./src/index.css -o ./src/output.css --watch
```

## Devtools

This sample application is configured to leverage the Fluid Framework's [Developer Tooling](https://fluidframework.com/docs/testing/devtools/).

Refer to the above article for examples and usage instructions.

## Building and Running

You can use the following npm scripts (`npm run SCRIPT-NAME`) to build and run the app.

| Script         | Description                                           |
| -------------- | ----------------------------------------------------- |
| `start`        | Starts the development server (same as `dev`)         |
| `dev`          | Runs the app in development mode with Vite dev server |
| `dev:local`    | Runs the app using local Fluid relay service          |
| `dev:azure`    | Runs the app using Azure Fluid Relay service          |
| `build`        | Builds the app for production (compile + webpack)     |
| `compile`      | Compiles TypeScript source code to JavaScript         |
| `webpack`      | Builds the app using Vite                             |
| `start:server` | Starts the local Azure Fluid Relay service            |
| `format`       | Formats source code using Prettier                    |
| `lint`         | Lints source code using ESLint                        |
| `test`         | Runs end-to-end tests with Playwright                 |
| `pretest`      | Installs Playwright dependencies                      |

### Development Workflow

1. **Start Local Service** (for local development):

    ```bash
    npm run start:server
    ```

2. **Start Development Server**:

    ```bash
    npm start          # Uses default configuration
    npm run dev:local  # Uses local Fluid service
    npm run dev:azure  # Uses Azure Fluid Relay
    ```

3. **Access the Application**:

    Open [http://localhost:8080/](http://localhost:8080/) in multiple browser tabs to test collaboration features.

## Authentication & Azure Integration

The application supports multiple authentication and hosting scenarios:

### Local Development

- Uses local Fluid relay service for development
- No authentication required
- Automatic user generation for testing

### Azure Fluid Relay

- Integrates with Azure Fluid Relay service
- Supports Microsoft Graph authentication
- Real user profiles and avatars
- Enterprise-grade collaboration features

### Configuration

Authentication and service configuration is handled in the `src/infra/` folder:

- **`azure/`**: Azure-specific client and token providers
- **`auth.ts`**: Authentication management
- **`fluid.ts`**: Fluid Framework setup
- **`tokenProvider.ts`**: Token provider interfaces

## Project Structure

```text
src/
├── infra/              # Fluid Framework and authentication setup
├── react/              # React components and UI
│   ├── contexts/       # React contexts for data management
│   ├── hooks/          # Custom React hooks
│   └── *.tsx          # Component files (itemux, tableux, etc.)
├── schema/             # SharedTree schema definitions
├── start/              # Application initialization
├── utils/              # Utility functions and managers
│   ├── presence/       # Presence API implementations (signal-based)
│   │   ├── drag.ts     # Real-time drag operations with signal optimization
│   │   ├── resize.ts   # Shape resize collaboration with batched updates
│   │   ├── selection.ts # Multi-user selection tracking with state management
│   │   ├── users.ts    # User management and profiles with auto-cleanup
│   │   └── Interfaces/ # TypeScript interfaces for presence and signals
└── *.ts               # Main application files
```

### Key Files

- **`index.tsx`**: Application entry point
- **`app_load.tsx`**: Application loader and initialization
- **`ux.tsx`**: Main UI component
- **`itemux.tsx`**: Canvas item rendering and interactions (includes presence indicators)
- **`tableux.tsx`**: Table component with virtual scrolling and presence
- **`contexts/PresenceContext.tsx`**: React context for presence data with signal management
- **`hooks/usePresenceManager.tsx`**: React hook for presence subscriptions with automatic optimization

This structure promotes modularity, type safety, and maintainable code organization for collaborative applications. The signal-based presence architecture ensures optimal performance while providing simple, developer-friendly APIs.
