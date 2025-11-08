# Frontend Guideline Document

This document outlines the frontend setup for the `isp-management-suite` project. It covers the overall architecture, design principles, styling, component organization, state management, routing, performance techniques, testing strategies, and a final summary. The goal is to provide clear, easy-to-follow guidelines so anyone on the team can understand and extend the frontend without confusion.

## 1. Frontend Architecture

### Overview
The frontend is built with Next.js (App Router) and React. We use TypeScript for type safety and Tailwind CSS combined with shadcn/ui for styling and pre-built components. This setup provides:
- **Server and Client Components**: Fast initial loads (SSR) and dynamic interactions (Client Components).
- **File-based Routing**: Clear mapping between URLs and React components.
- **Type Safety**: Fewer bugs in data-driven features like billing tables and forms.

### Scalability, Maintainability, Performance
- **Scalability**: Component-based structure lets you add or replace features (e.g., new dashboard widgets) without rewriting core code. Next.js makes it easy to split code by route.
- **Maintainability**: TypeScript and a consistent folder layout (`/app`, `/components`, `/styles`) make it simple to locate, update, and refactor code.
- **Performance**: Next.js handles code splitting automatically. Using Server Components reduces bundle sizes on the client. Tailwind’s utility classes eliminate unused CSS through tree-shaking.

## 2. Design Principles

### Usability
- Keep interfaces simple and intuitive. Use clear labels and consistent iconography from shadcn/ui.
- Offer immediate feedback (loading spinners, disabled states).

### Accessibility
- Follow WCAG guidelines: proper ARIA attributes, keyboard navigability, and sufficient color contrast.
- Use semantic HTML (button, form, table) so assistive technologies can interpret content correctly.

### Responsiveness
- Mobile-first design with Tailwind’s responsive utilities (sm:, md:, lg:). Ensure layouts adapt gracefully to different screen sizes.
- Test common breakpoints: mobile (360px–480px), tablet (768px), desktop (1024px+).

## 3. Styling and Theming

### Styling Approach
- **Tailwind CSS** (utility-first) for rapid, consistent styling.
- **shadcn/ui** for building blocks (buttons, dialogs, tables) that match Tailwind’s design system.

### Theming
- A single Tailwind configuration (`tailwind.config.js`) defines color scales and typography.
- Theme changes (dark mode or custom brand colors) go in this central file and propagate everywhere.

### Visual Style
- **Look & Feel**: Modern, flat, minimal—focus on data clarity.
- **Glassmorphism**: Light use for overlays (dashboard widgets) to give depth without distraction.

### Color Palette
- Primary: #1E3A8A (Indigo 800)
- Secondary: #2563EB (Blue 600)
- Accent: #F59E0B (Amber 500)
- Neutral (backgrounds and borders): #F3F4F6 (Gray 100), #E5E7EB (Gray 200)
- Success: #10B981 (Green 500)
- Warning: #FBBF24 (Yellow 400)
- Error: #EF4444 (Red 500)

### Typography
- **Font Family**: `Inter, system-ui, sans-serif`
- **Headings**: Bold, scale from 1.5rem to 2.25rem based on hierarchy.
- **Body Text**: Regular 1rem, line-height 1.5.

## 4. Component Structure

### Organization
- `/components/atoms`: Basic elements (Button, Input, Icon).
- `/components/molecules`: Combinations (FormField, Card).
- `/components/organisms`: Complex sections (DashboardChart, DataTable).
- `/components/templates`: Page layouts (DashboardLayout, AuthLayout).

### Reusability and Maintainability
- Each component in its own folder with `.tsx`, `.test.tsx`, and optional `.module.css` (if needed).
- Use props for configuration rather than inline changes. This encourages reuse across modules (customers, billing, support).
- Document components with JSDoc-style comments for props and examples.

## 5. State Management

### Approach
- **Server State** (data from API): Use **React Query** (or SWR) for fetching, caching, and background updates.
- **Global UI State** (theme, modals): Use **React Context** in combination with `useReducer` for predictable updates.
- **Local Component State**: React’s `useState` for simple toggles and form inputs.

### Sharing State
- Wrap the application in providers (e.g., `QueryClientProvider`, `ThemeContext.Provider`) at the root (`/app/layout.tsx`).
- Use custom hooks (e.g., `useAuth`, `useNotifications`) to encapsulate context logic and provide a clean API to components.

## 6. Routing and Navigation

### Routing
- **Next.js App Router** uses the `/app` directory: nested folders become nested routes automatically.
- Dynamic routes (`[id]`) for detail pages (customer profiles, invoice details).
- Layout files (`layout.tsx`) define shared wrappers (navigation bar, sidebar).

### Navigation Structure
- **Sidebar**: Primary navigation between modules (Dashboard, Customers, Billing, Support).
- **Breadcrumbs**: Show the current path and allow quick jumps.
- **Top Bar**: Holds user menu, notifications, and quick actions.

## 7. Performance Optimization

- **Code Splitting**: Next.js automatically splits code by route. For large components (e.g., maps), use dynamic imports: `const Map = dynamic(() => import('./Map'), { ssr: false })`.
- **Lazy Loading**: Images via `next/image` which lazy loads and optimizes formats.
- **Caching**: React Query for API data with sensible stale times.
- **Minimize CSS**: Tailwind purges unused classes in production builds.
- **Prefetching**: Next.js prefetches linked pages in view to speed up navigation.

## 8. Testing and Quality Assurance

### Unit Tests
- **Vitest** (or Jest) + **React Testing Library** for components and hooks.
- Focus on rendering, user interactions, and prop variations.

### Integration Tests
- Test API route handlers (mock database with Drizzle) and component-data interactions.

### End-to-End Tests
- **Playwright** or **Cypress** for critical user flows: login, invoice payment, automated isolation.

### Linting and Formatting
- **ESLint** with TypeScript rules and Next.js plugin.
- **Prettier** for consistent code style.

### CI/CD
- Run tests and linters on every pull request through GitHub Actions or Vercel’s build checks.

## 9. Conclusion and Overall Frontend Summary

The `isp-management-suite` frontend is built on a modern, scalable stack: Next.js for routing and SSR, React for interactivity, TypeScript for safety, and Tailwind CSS + shadcn/ui for consistent styling. By following these guidelines—component-driven development, clear state management, performance best practices, and comprehensive testing—you’ll deliver a reliable, maintainable, and user-friendly ISP management interface. This setup not only accelerates new feature development but also ensures long-term code health and a smooth experience for end users.