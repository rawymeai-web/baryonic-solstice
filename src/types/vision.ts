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
    position?: string;
    x_coordinate?: number;
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
    position?: string;
    x_coordinate?: number;
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
        style_profile?: any;
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
        emotional_tone?: string;
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
        composition_rule?: string;
        do_not_center?: string;
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
        visual_description?: string;
        story_function?: string;
        style_rendering?: string;
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
