# replit.md

## Overview

This is a full-stack classified ads application called "AdBoard" built with React, Node.js/Express, and PostgreSQL. The application allows users to browse, search, and manage classified advertisements with features like user authentication, shopping cart functionality, and a responsive design using Tailwind CSS and shadcn/ui components.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: React Context API for auth and cart state, TanStack Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite for development and building
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: JWT tokens with bcrypt for password hashing
- **Session Storage**: PostgreSQL sessions with connect-pg-simple
- **Development**: Hot reloading with Vite middleware integration

### Database Design
- **Primary Database**: PostgreSQL (Replit native database)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Tables**: 
  - `users` - User accounts with phone-based authentication and timestamps
  - `ads` - Classified advertisements with images, location, specifications, and full descriptions
  - `cart_items` - Shopping cart functionality linking users to ads

## Key Components

### Authentication System
- Phone number-based user registration and login
- JWT token authentication with localStorage persistence
- Password hashing using bcrypt
- Protected routes and API endpoints

### Advertisement Management
- Full CRUD operations for classified ads
- Image upload support (array of image URLs)
- Category-based organization
- Location-based filtering with latitude/longitude support
- Rich text descriptions and specifications (JSON storage)
- Price filtering and search functionality

### Shopping Cart
- Add/remove ads to/from cart
- Persistent cart state across sessions
- Cart count display in header
- Side panel cart view with checkout placeholder

### User Interface
- Responsive design with mobile-first approach
- Dark/light theme support via CSS variables
- Modal-based ad details view
- Toast notifications for user feedback
- Category navigation with icons
- Search and filter functionality

## Data Flow

1. **User Authentication**: Users register/login → JWT token stored → Token sent with API requests
2. **Ad Browsing**: Home page loads ads → Category/search filters applied → Results displayed in grid
3. **Ad Management**: Authenticated users can create/edit/delete their ads via dashboard
4. **Shopping Cart**: Users add ads to cart → Cart state managed via React Context → Persistent across sessions
5. **Real-time Updates**: TanStack Query handles data fetching, caching, and synchronization

## External Dependencies

### Frontend Dependencies
- **UI Framework**: @radix-ui components for accessible UI primitives
- **State Management**: @tanstack/react-query for server state management
- **Forms**: @hookform/resolvers with Zod for validation
- **Styling**: class-variance-authority and clsx for conditional styling
- **Date Handling**: date-fns for date formatting
- **Icons**: Lucide React for consistent iconography

### Backend Dependencies
- **Database**: @neondatabase/serverless for PostgreSQL connection
- **ORM**: drizzle-orm with drizzle-zod for schema validation
- **Authentication**: jsonwebtoken and bcrypt for auth handling
- **Session**: connect-pg-simple for PostgreSQL session storage
- **Development**: tsx for TypeScript execution

### Development Tools
- **Build**: Vite with React plugin and TypeScript support
- **Linting**: ESLint configuration for code quality
- **Styling**: PostCSS with Tailwind CSS and Autoprefixer
- **Database**: Drizzle Kit for schema management and migrations

## Deployment Strategy

### Production Build
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations run via `npm run db:push`

### Environment Configuration
- **Development**: Uses tsx for hot reloading and Vite dev server
- **Production**: Serves static files from Express with built React app
- **Database**: PostgreSQL connection via DATABASE_URL environment variable

### Replit Configuration
- **Runtime**: Node.js 20 with PostgreSQL 16 module
- **Development Server**: Runs on port 5000 with auto-reload
- **Build Process**: Automated build and start scripts for deployment
- **File Watching**: Configured to ignore build artifacts and dependencies

## Changelog

```
Changelog:
- June 25, 2025. Initial setup with in-memory storage
- June 25, 2025. Added PostgreSQL database integration with Drizzle ORM
- June 25, 2025. Migrated from MemStorage to DatabaseStorage implementation
- June 25, 2025. Successfully deployed sample data to PostgreSQL database
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```