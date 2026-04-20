
export type Screen =
    | 'language'
    | 'welcome'
    | 'personalization'
    | 'modeSelection'
    | 'styleChoice'
    | 'styleSelection'
    | 'theme'
    | 'size'
    | 'workflow'
    | 'generating'
    | 'unified-generation'
    | 'preview'
    | 'debug-view' // NEW: For showing the live logs
    | 'checkout'
    | 'confirmation'
    | 'admin'
    | 'orderStatus';

export type Language = 'ar' | 'en' | 'de' | 'es' | 'fr' | 'pt' | 'it' | 'ru' | 'ja' | 'tr';

export interface Character {
    name: string;
    type: 'person' | 'object';
    age?: string;
    gender?: 'boy' | 'girl'; // For Second Character logic
    images: File[];
    imageBases64: string[];
    description: string;
    refinedDescription?: string;
    relationship?: string;
}

export interface StoryBlueprint {
    foundation: {
        title: string;
        targetAge: string;
        storyCore: string;
        heroDesire: string;
        mainChallenge: string;
        primaryVisualAnchor: string; // NEW
        moral: string;
        failedAttemptSpread?: number; // NEW
        insightSpread?: number; // NEW
        finalSolutionMethod?: string; // NEW
        // Legacy fields kept optional for backward compat if needed
        masterSetting?: string;
        catalyst?: string;
        limiter?: string;
        signatureAccessory?: string;
        bibleSelections?: {
            coreIndex: number;
            catalystIndex: number;
            limiterIndex: number;
            dnaIndex: number;
            mandateIndex: number;
        };
    };
    characters: {
        heroProfile: string;
        supportingRoles: {
            name: string;
            role: string;
            functionType?: string; // NEW
            appearanceSpreads?: number[]; // NEW
            influenceSpreads?: number[]; // NEW
            influence?: string;
            visualKey: string;
        }[];
    };
    structure: {
        arcSummary: string;
        spreads: {
            spreadNumber: number;
            purpose?: string; // NEW
            narrative: string;
            transitionHook?: string; // NEW
            visualFocus?: string; // NEW
            highlightAction?: string; // NEW
            cameraAngle?: string; // NEW
            emotionalBeat: string;
            specificLocation: string;
            environmentType: string;
            timeOfDay: string;
            mood?: string;
            lighting?: string;
            newCharacters?: string[];
        }[];
    };
}

export interface ThemeVariant {
    title: { ar: string; en: string; };
    description: { ar: string; en: string; };
    skeleton: {
        storyCores: string[];
        catalysts: string[];
        limiters: string[];
        themeVisualDNA: string[];
        settingMandates: string[];
    };
}

export interface StoryTheme {
    id: string;
    title: { ar: string; en: string; };
    description: { ar: string; en: string; };
    emoji: string;
    category: 'values' | 'adventures' | 'custom';
    visualDNA: string;
    variants?: {
        younger: ThemeVariant; // Target ages 1-5
        older: ThemeVariant;   // Target ages 6+
    };
    skeleton: {
        storyCores: string[];
        catalysts: string[];
        limiters: string[];
        themeVisualDNA: string[];
        settingMandates: string[];
    };
}

export interface AppSettings {
    defaultMethod: string;
    defaultSpreadCount: number;
    enableDebugView: boolean;
    generationDelay: number;
    unitProductionCost: number;
    unitAiCost: number;
    unitShippingCost: number;
    targetModel: string;
}

export interface ShippingDetails {
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
}

export interface AdminOrder {
    id?: string;
    orderNumber: string;
    customerName: string;
    orderDate: string;
    status: OrderStatus;
    total: number;
    productionCost: number;
    aiCost: number;
    shippingCost: number;
    storyData: StoryData;
    shippingDetails: ShippingDetails;
    packageUrl?: string;
}

// Added interface for CoverDebugImages to support debugging views and step-by-step review
export interface CoverDebugImages {
    finalComposite?: string;
    step1_anchorScene?: string;
    step2_frontCover?: string;
    step3_finalWrap?: string;
}

export interface StoryData {
    childName: string;
    childAge: string;
    childGender?: 'boy' | 'girl'; // Captured conditionally for age >= 6
    title: string;
    theme: string;
    themeId?: string;
    occasion?: string;
    storyMode?: 'classic' | 'portals';
    mainCharacter: Character;
    secondCharacter?: Character;
    useSecondCharacter: boolean;
    coverImageUrl: string;
    actualCoverPrompt?: string;
    pages: Page[];
    size: string;
    selectedStylePrompt: string;
    selectedStyleNames?: string[];
    technicalStyleGuide?: string;
    styleSeed?: number;
    customGoal?: string;
    customChallenge?: string;
    customStoryText?: string; // NEW: Explicit script or poem provided by user
    customIllustrationNotes?: string;
    blueprint?: StoryBlueprint;
    rawScript?: any[]; // NEW: Capture raw unedited draft for diagnostics
    spreadPlan?: SpreadDesignPlan;
    finalPrompts?: string[];
    styleReferenceImageBase64?: string;
    secondCharacterImageBase64?: string; // NEW: Hosted / Raw base64 for secondary character DNA
    // Added optional fields for debug and comparison
    coverDebugImages?: CoverDebugImages;
    selectedDebugMethods?: string[];
    workflowLogs?: WorkflowLog[];
    language?: Language;
}

export interface WorkflowLog {
    stage: 'Blueprint' | 'Drafting' | 'Visual Plan' | 'Prompt Engineering' | 'QA' | 'Production';
    timestamp: number;
    inputs: any;
    outputs: any;
    status: 'Success' | 'Failed';
    durationMs: number;
}

export type OrderStatus = 'New Order' | 'Processing' | 'Shipping' | 'Completed';

export interface AdminCustomer {
    id: string;
    name: string;
    email: string;
    phone: string;
    firstOrderDate: string;
    lastOrderDate: string;
    orderCount: number;
}

export interface ProductSize {
    id: string;
    name: string;
    price: number;
    previewImageUrl: string;
    isAvailable: boolean;
    cover: { totalWidthCm: number; totalHeightCm: number; spineWidthCm: number; };
    page: { widthCm: number; heightCm: number; };
    margins: { topCm: number; bottomCm: number; outerCm: number; innerCm: number; };
    coverContent: {
        barcode: { fromRightCm: number; fromTopCm: number; widthCm: number; heightCm: number; },
        format: { fromTopCm: number; widthCm: number; heightCm: number; }
        title: { fromTopCm: number; widthCm: number; heightCm: number; }
    };
}

export interface SpreadDesignPlan {
    visualAnchors: {
        heroTraits: string;
        signatureItems: string;
        recurringLocations: string;
        persistentProps: string;
        spatialLogic: string;
    };
    characters?: StoryBlueprint['characters']; // NEW: Propagate Blueprint characters for consistency
    spreads: {
        spreadNumber: number;
        setting: string;
        environmentType: string;
        timeOfDay: string;
        lighting: string;
        mainContentSide: string;
        keyActions: string;
        mood: string;
        emotion: string; // NEW: Specific emotional resonance
        cameraAngle: string; // NEW: Cinematic camera placement
        colorPalette: string; // NEW: Specific color tones for this spread
        sceneProps?: { name: string, physical_description: string }[]; // NEW: Strict array mapping
        continuityNotes: string;
    }[];
}

export interface TextBlock {
    text: string;
    position: { top: number; left: number; width: number; };
    alignment: string;
}

export interface Page {
    pageNumber: number;
    text: string;
    illustrationUrl: string;
    actualPrompt?: string;
    textBlocks?: TextBlock[];
    textSide?: 'left' | 'right';
    anchorIllustrationUrl?: string;
    alternativeIllustrationUrl?: string;
    debugContext?: any;
    sceneBlueprint?: any;
    pageSummary?: string;
}

export interface StoryPlan {
    core: {
        heroDesire: string;
        mainChallenge: string;
        catalyst: string;
        limiter: string;
    };
    characterRoles: {
        name: string;
        roleType: string;
        influence: string;
        visualKey: string;
    }[];
    phases: {
        phaseNumber: number;
        purpose: string;
        keyAction: string;
    }[];
    consistencyAnchors: {
        objectName: string;
        description: string;
    }[];
}

// ==========================================
// SUBSCRIPTION PIPELINE TYPES
// ==========================================

export type DbOrderStatus =
    | 'draft' | 'pending_payment' | 'paid'
    | 'paid_confirmed' | 'queued' | 'theme_assigned'
    | 'story_generating' | 'story_ready'
    | 'illustrations_generating' | 'illustrations_ready'
    | 'book_compiling' | 'softcopy_ready'
    | 'awaiting_preview_approval' | 'sent_to_print'
    | 'printing' | 'shipped' | 'delivered'
    | 'failed' | 'on_hold' | 'cancelled';

export type SubscriptionStatus = 'active' | 'payment_retry' | 'paused' | 'cancelled' | 'expired';
export type SubscriptionPlan = 'monthly' | 'yearly';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface Hero {
    id: string;
    user_id: string;
    name: string;
    date_of_birth: string; // ISO Date String
    dna_image_url?: string;
    created_at?: string;
}

export interface HeroPreferences {
    hero_id: string;
    preferred_theme_tags: string[];
    blocked_theme_tags: string[];
    style_mode: 'fixed' | 'rotate';
    style_reference_image_base64?: string;
    updated_at?: string;
}

export interface Theme {
    id: string;
    title: string;
    description?: string;
    visual_dna_prompt: string;
    tags: string[];
    active_from: string;
    active_to?: string;
}

export interface Subscription {
    id: string;
    user_id: string;
    hero_id: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    stripe_subscription_id?: string;
    shipping_address_id?: string;
    next_billing_date: string; // ISO Date
}

export interface HeroThemeHistory {
    id: string;
    hero_id: string;
    theme_id: string;
    subscription_id?: string;
    order_id?: string;
    assigned_at?: string;
}

export interface OrderJob {
    id: string;
    order_id: string;
    job_type: 'story' | 'illustration' | 'compilation' | 'print_handoff';
    status: JobStatus;
    attempts: number;
    started_at?: string;
    finished_at?: string;
    error_message?: string;
    worker_name?: string;
    artifact_refs?: Record<string, any>;
}

export interface EventAuditLog {
    id: string;
    event_type: string;
    order_id?: string;
    subscription_id?: string;
    admin_id?: string;
    details?: Record<string, any>;
    created_at?: string;
}

// ==========================================
// VISION AI PROMPT SCHEMA (JSON ARCHITECTURE)
// ==========================================

export interface VisionPersonEntitySchema {
    id: string;
    unique_token_name: string;
    entity_type: 'person_entity';
    source_reference: {
        image_input: string;
        binding_instruction: string;
        weight: string;
    };
    spatial_anchor: string;
    immutable_identity: {
        facial_structure?: string;
        hair_style_and_color?: string;
        distinct_marks?: string;
        clothing_lock?: string;
    };
    current_variables: {
        pose_action: string;
        attire?: string;
        emotion?: string;
    };
}

export interface VisionPropEntitySchema {
    id: string;
    unique_token_name: string;
    entity_type: 'prop_entity';
    source_reference: {
        image_input: string;
        binding_instruction: string;
        weight: string;
    };
    spatial_anchor: string;
    physical_description?: string;
    color_details?: {
        base_color_hex?: string;
        secondary_colors?: string[];
        gradient_or_pattern?: string;
    };
    current_variables: { pose_action: string; };
}

export interface VisionPromptSchema {
    meta: {
        image_quality?: string;
        image_type?: string;
        resolution_estimation?: string;
        file_characteristics?: {
            compression_artifacts?: string;
            noise_level?: string;
            lens_type_estimation?: string;
        };
    };
    // Character entities — strictly typed, photo-bound via tokens [[HERO_A]] / [[HERO_B]]
    entities?: (VisionPersonEntitySchema | VisionPropEntitySchema)[];
    global_context: {
        scene_description?: string;
        environment_type?: string;
        time_of_day?: string;
        weather_atmosphere?: string;
        environment_constraint?: string; // Grounding constraint to prevent environment drift (e.g. tropical backyard)
        lighting?: {
            source?: string;
            direction?: string;
            quality?: string;
            color_temperature?: string;
        };
        color_palette?: {
            dominant_hex_estimates?: string[];
            accent_colors?: string[];
            contrast_level?: string;
        };
    };
    composition: {
        camera_angle?: string;
        framing?: string;
        depth_of_field?: string;
        focal_point?: string;
        symmetry_type?: string;
        rule_of_thirds_alignment?: string;
    };
    objects: Array<{
        id?: string;
        label?: string;
        category?: string;
        location?: {
            relative_position?: string;
            bounding_box_percentage?: {
                x?: number;
                y?: number;
                width?: number;
                height?: number;
            };
        };
        dimensions_relative?: string;
        distance_from_camera?: string;
        pose_orientation?: string;
        material?: string;
        surface_properties?: {
            texture?: string;
            reflectivity?: string;
            micro_details?: string;
            wear_state?: string;
        };
        color_details?: {
            base_color_hex?: string;
            secondary_colors?: string[];
            gradient_or_pattern?: string;
        };
        interaction_with_light?: {
            shadow_casting?: string;
            highlight_zones?: string;
            translucency?: string;
        };
        text_content?: {
            raw_text?: string;
            font_style?: string;
            font_weight?: string;
            text_case?: string;
            alignment?: string;
            color_hex?: string;
        } | null;
        relationships?: Array<{
            type?: string;
            target_object_id?: string;
        }>;
    }>;
    background_details: {
        texture?: string;
        patterns?: string;
        lighting_behavior?: string;
        additional_elements?: string[];
    };
    foreground_elements: {
        particles?: string;
        artifacts?: string;
    };
    reconstruction_notes: {
        mandatory_elements_for_recreation: string[];
        sensitivity_factors?: string[];
        ambiguities?: string[];
    };
}
