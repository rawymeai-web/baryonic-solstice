# Master UI/UX Architecture Blueprint

This document serves as the definitive structural constraints list for the entire application. It maps every frontend and backend screen, establishing strict layouts, mandatory interactive elements, exact naming conventions for design mapping, and dynamic data targets.

---

## 1. FRONT-END SCREENS

### 1.1 Welcome & Language Screen
* **Screen Name & Identity:** Frontend - Welcome/Landing
* **Structural Layout:** 
  * Header: Hidden or Minimal (Logo only).
  * Main Content: Full-height hero section, cinematic background.
  * Footer: Minimal legal links, Language Selector.
* **Mandatory Interactive Elements:**
  * **Language Selector Dropdown** [Default, Active]
  * **Start Journey Button** [Default, Hover, Active]
* **Exact Naming Conventions:** `btn_start_journey`, `dropdown_language_selector`, `container_hero_bg`
* **Dynamic Data Targets:** Fetches localized translation strings based on `language` state.

### 1.2 Personalization Screen (Story Context)
* **Screen Name & Identity:** Frontend - Step 1: Personalization
* **Structural Layout:**
  * Header: Standard App Header with Back Navigation.
  * Main Content: Form-centric, single-column or split-card layout.
  * Footer: Fixed Bottom Action Bar.
* **Mandatory Interactive Elements:**
  * **Child Name Input** [Default, Focus, Error]
  * **Child Age Input** (Number) [Default, Focus]
  * **Story Prompt Textarea** [Default, Focus]
  * **Dual-Hero Toggle Switch** [On, Off]
  * **Secondary Hero Inputs (Conditional)** (Name, Relation) [Default, Focus, Disabled]
  * **Next Button** [Disabled (if required fields empty), Active, Loading]
* **Exact Naming Conventions:** `input_hero_name`, `input_hero_age`, `textarea_story_prompt`, `toggle_dual_hero`, `input_hero_b_name`, `btn_step_next`, `btn_step_back`
* **Dynamic Data Targets:** Updates `StoryContext.mainCharacter` and `StoryContext.secondCharacter`.

### 1.3 DNA Upload Screen (Style Choice)
* **Screen Name & Identity:** Frontend - Step 2: Photo Upload
* **Structural Layout:**
  * Header: Standard App Header, Progress Indicator.
  * Main Content: Split view (Instructions Left, Dropzones Right) or centered stacked dropzones.
  * Footer: Fixed Bottom Action Bar.
* **Mandatory Interactive Elements:**
  * **Hero A Photo Dropzone** [Empty, Hover/Drag, Uploading, Filled]
  * **Hero B Photo Dropzone (Conditional)** [Empty, Hover/Drag, Uploading, Filled]
  * **Next Button** [Disabled, Active]
* **Exact Naming Conventions:** `dropzone_hero_a_upload`, `dropzone_hero_b_upload`, `img_preview_hero_a`, `btn_step_next`
* **Dynamic Data Targets:** Converts uploaded files to Base64 and binds to `StoryContext.mainCharacter.imageRawUrl`.

### 1.4 Theme Selection Screen
* **Screen Name & Identity:** Frontend - Step 3: Story Theme
* **Structural Layout:**
  * Header: Standard App Header.
  * Main Content: Horizontal scrolling carousel or masonry grid of theme cards.
  * Footer: Fixed Bottom Action Bar.
* **Mandatory Interactive Elements:**
  * **Theme Cards** [Default, Hover, Selected]
  * **"View Sample" Modal Trigger** [Default, Hover]
  * **Next Button** [Disabled, Active]
* **Exact Naming Conventions:** `card_theme_item`, `modal_theme_sample`, `btn_select_theme`, `btn_step_next`
* **Dynamic Data Targets:** Populated by `INITIAL_THEMES` (Supabase `themes` table).

### 1.5 Art Style Selection Screen
* **Screen Name & Identity:** Frontend - Step 4: Art Style
* **Structural Layout:**
  * Header: Standard App Header.
  * Main Content: **Premium Hero Presentation Layout** — Large high-res preview on top/left, sleek horizontal thumbnail selector below/right.
  * Footer: Fixed Bottom Action Bar.
* **Mandatory Interactive Elements:**
  * **Style Thumbnail Buttons** [Default, Hover, Active/Selected]
  * **Proceed to Checkout Button** [Active]
* **Exact Naming Conventions:** `img_hero_style_preview`, `container_style_thumbnails`, `btn_style_thumb`, `btn_proceed_checkout`
* **Dynamic Data Targets:** `ART_STYLE_OPTIONS` constant. Updates `StoryContext.selectedStylePrompt`.

### 1.6 Checkout & Shipping Screen
* **Screen Name & Identity:** Frontend - Checkout
* **Structural Layout:**
  * Header: Secure Checkout Header.
  * Main Content: Split layout — Left: Shipping & Subscription Form; Right: Order Summary.
  * Footer: Trust badges, secure payment icons.
* **Mandatory Interactive Elements:**
  * **Subscription Tier Toggles (Radio group)** (One-Time, Monthly, Yearly) [Selected, Unselected]
  * **Shipping Inputs** (Name, Email, Address, Zip, City, Country) [Default, Focus, Error]
  * **Pay Now / Submit Button** [Default, Loading]
* **Exact Naming Conventions:** `radio_tier_onetime`, `radio_tier_monthly`, `form_shipping_details`, `input_shipping_email`, `btn_pay_now`, `panel_order_summary`
* **Dynamic Data Targets:** Triggers API `/orders/draft`. Computes `paymentAmount` from pricing logic.

### 1.7 Payment Modal
* **Screen Name & Identity:** Frontend - Stripe Overlay
* **Structural Layout:**
  * Main Content: Centered modal overlay over darkened background.
* **Mandatory Interactive Elements:**
  * **Stripe Card Element** [Default, Focus, Error, Complete]
  * **Confirm Payment Button** [Default, Processing]
  * **Close/Cancel Button** [Default]
* **Exact Naming Conventions:** `modal_stripe_payment`, `element_stripe_card`, `btn_confirm_payment`
* **Dynamic Data Targets:** Stripe Elements iframe binding.

### 1.8 Unified Generation Screen
* **Screen Name & Identity:** Frontend - Loading/Generation Engine
* **Structural Layout:**
  * Header: Hidden.
  * Main Content: Full-screen cinematic loading sequence.
* **Mandatory Interactive Elements:**
  * **Progress Bar (Read-only)**
  * *(No user interaction intended, auto-redirects on completion)*
* **Exact Naming Conventions:** `bar_generation_progress`, `text_generation_status`, `text_dynamic_quote`
* **Dynamic Data Targets:** Listens to `useStoryGeneration` and `useWorkflow` hooks for progress (0-100%).

### 1.9 Customer Preview Screen
* **Screen Name & Identity:** Frontend - Book Viewer
* **Structural Layout:**
  * Header: Action Header (Download, Return).
  * Main Content: Full-width book carousel / flipbook.
  * Footer: Thumbnails or pagination dots.
* **Mandatory Interactive Elements:**
  * **Carousel Next/Prev Arrows** [Default, Hover, Disabled on edges]
  * **Title Edit Input (On Cover)** [Default, Focus]
  * **Order Physical Copy Button** [Default, Hover]
* **Exact Naming Conventions:** `carousel_book_viewer`, `btn_carousel_next`, `input_edit_title`, `btn_order_physical`
* **Dynamic Data Targets:** Renders base64 images and text from `StoryContext.spreads`.

### 1.10 Customer Dashboard & Auth
* **Screen Name & Identity:** Frontend - My Account
* **Structural Layout:**
  * Header: Standard App Header + User Greeting.
  * Main Content: Tabbed view (Order History, Subscription Management).
* **Mandatory Interactive Elements:**
  * **Login Email/Password Inputs** [Default, Focus]
  * **View Digital Book Button** [Default]
  * **Manage Subscription Button** [Default]
  * **Logout Button** [Default]
* **Exact Naming Conventions:** `form_auth_login`, `list_order_history`, `btn_view_book`, `btn_manage_sub`
* **Dynamic Data Targets:** Supabase `auth.users`, `orders` (filtered by `customer_id`), `subscriptions`.

---

## 2. BACK-END / ADMIN SCREENS

### 2.1 Admin Dashboard
* **Screen Name & Identity:** Backend (Rendered in Frontend App) - Admin Master
* **Structural Layout:**
  * Header: Admin Nav Bar with Status Indicators.
  * Main Content: Left Sidebar Nav; Center Data Table View.
* **Mandatory Interactive Elements:**
  * **Tab Navigation** (Orders, Themes, Settings, Bible) [Active, Inactive]
  * **Order Row Action: "Edit/Resume" Button** [Default, Hover]
  * **Order Row Action: "Download Package" Button** [Default, Hover]
  * **Search/Filter Bar** [Default, Focus]
* **Exact Naming Conventions:** `nav_admin_sidebar`, `table_admin_orders`, `btn_admin_edit_order`, `btn_admin_download_zip`
* **Dynamic Data Targets:** Reads directly from Supabase `orders`, `themes`, `guidebook`.

### 2.2 Admin Storybook Editor
* **Screen Name & Identity:** Backend - Story & Art Editor
* **Structural Layout:**
  * Header: Action Bar (Save to DB, Download PDF, Exit).
  * Left Sidebar: AI Instructions & Spread Parameters.
  * Center Canvas: Active Spread Preview (Image + Text layout).
  * Right Sidebar: Spread Navigator (Thumbnails 1-8 + Cover).
* **Mandatory Interactive Elements:**
  * **Spread Navigator Thumbnails** [Default, Active]
  * **Global AI Instruction Textarea** [Default, Focus]
  * **Apply AI Edit Button** [Default, Loading]
  * **Manual Text Editor Box** [Default, Focus]
  * **Image Layout Sliders** (Pan X, Pan Y) [Draggable]
  * **Text Layout Sliders** (Text X, Text Y) [Draggable]
  * **Regenerate Image Button** [Default, Loading]
  * **Save to Database Button** [Default, Success]
  * **Download Print Package Button** [Default, Loading]
* **Exact Naming Conventions:** `sidebar_editor_controls`, `textarea_global_ai`, `btn_apply_ai_edit`, `slider_pan_x`, `input_spread_text`, `btn_save_db`, `btn_download_print_pkg`, `canvas_active_spread`
* **Dynamic Data Targets:** Modifies specific `order.story_data` JSON. Triggers backend PDF generation route and Supabase updates.
---

## 3. GLOBAL SHARED COMPONENTS

### 3.1 Persistent Global Header
* **Structural Layout:** Sticky Top Nav. Logo (Left), Utility Links (Right/Center).
* **Mandatory Interactive Elements:**
  * **Admin Entrance (Invisible/Subtle)** [Default]
  * **"My Orders" Link** [Default, Active]
  * **Language Switcher** [Default, Open]
  * **Currency Selector** [Default, Open]
* **Exact Naming Conventions:** `component_global_header`, `logo_main`, `btn_admin_entry`, `btn_nav_my_orders`, `dropdown_header_lang`, `dropdown_header_currency`

### 3.2 Persistent Global Footer
* **Structural Layout:** Centered or Multi-column (Desktop).
* **Mandatory Interactive Elements:**
  * **Order Status Check Button** [Default, Hover]
  * **Social/Legal Links** [Default]
* **Exact Naming Conventions:** `component_global_footer`, `btn_footer_check_status`, `link_privacy_policy`

### 3.3 Layout Overlays
* **Structural Layout:** Full-screen portals or floating modals.
* **Mandatory Interactive Elements:**
  * **Regional Discovery Modal** (Automatic on first visit) [Open]
  * **Order Status Modal** (Tracking UI) [Open]
* **Exact Naming Conventions:** `modal_regional_discovery`, `modal_order_status_tracking`
