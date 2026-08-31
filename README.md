# Rawy Engine & Admin Factory (baryonic-solstice)

AI-driven storytelling and personalized children's book generation platform.

## Architecture Overview

* **Framework:** Next.js (App Router) + TypeScript + Tailwind CSS
* **Database & Auth:** Supabase (PostgreSQL + Storage buckets)
* **AI Orchestrator:** Google Gemini (DNA Extraction, Outpainting, Narrative & Spread Generation)
* **Admin Portal (/admin):**
  * Real-time search & status filtering across orders, customers, and subscriptions
  * UTF-8 BOM CSV export for Arabic & English Excel compatibility
  * Minimizable sidebar with full-screen focus mode
  * Print-ready book generator and high-res asset stitcher

## Getting Started

1. Copy .env.example to .env.local and configure your API keys:
   \\\ash
   cp .env.example .env.local
   \\\

2. Install dependencies:
   \\\ash
   npm install
   \\\

3. Run the development server:
   \\\ash
   npm run dev
   \\\
   Open [http://localhost:3000/admin](http://localhost:3000/admin) to view the Admin Factory Control.

## Key Directory Structure

* \src/app/admin/\: Admin Dashboard, Orders View, Customer View, Subscriptions & Guidelines.
* \src/services/\: Business logic (Supabase integration, CSV export, generation pipelines).
* \src/components/editor/\: Live book editor, outpainting canvas, text layout engines.
