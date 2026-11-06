// Generated from migrations by scripts/generate-db-types.mjs; regenerate after schema changes.
import type {Json,OrderStatus} from '@mfu/types';
export type Database = {public:{Tables:{
audit_logs: {Row:{
 id: string;
 actor_id: string | null;
 entity: string;
 entity_id: string | null;
 action: string;
 before_data: Json | null;
 after_data: Json | null;
 created_at: string;
};Insert:{
 id?: string;
 actor_id?: string | null;
 entity: string;
 entity_id?: string | null;
 action: string;
 before_data?: Json | null;
 after_data?: Json | null;
 created_at?: string;
};Update:{
 id?: string;
 actor_id?: string | null;
 entity?: string;
 entity_id?: string | null;
 action?: string;
 before_data?: Json | null;
 after_data?: Json | null;
 created_at?: string;
};Relationships:[]};
catalog_assets: {Row:{
 id: string;
 uploader_id: string;
 path: string;
 filename: string;
 mime: string;
 kind: string;
 bytes: number;
 analysis: Json | null;
 created_at: string;
};Insert:{
 id?: string;
 uploader_id: string;
 path: string;
 filename: string;
 mime: string;
 kind: string;
 bytes: number;
 analysis?: Json | null;
 created_at?: string;
};Update:{
 id?: string;
 uploader_id?: string;
 path?: string;
 filename?: string;
 mime?: string;
 kind?: string;
 bytes?: number;
 analysis?: Json | null;
 created_at?: string;
};Relationships:[]};
catalog_inquiries: {Row:{
 id: string;
 owner_id: string;
 request_key: string;
 model_id: string;
 model_snapshot: Json;
 customer: Json;
 selection: Json;
 created_at: string;
};Insert:{
 id?: string;
 owner_id: string;
 request_key: string;
 model_id: string;
 model_snapshot: Json;
 customer: Json;
 selection: Json;
 created_at?: string;
};Update:{
 id?: string;
 owner_id?: string;
 request_key?: string;
 model_id?: string;
 model_snapshot?: Json;
 customer?: Json;
 selection?: Json;
 created_at?: string;
};Relationships:[]};
catalog_models: {Row:{
 id: string;
 name: string;
 description: string;
 source_kind: string;
 source_url: string;
 creator: string;
 creator_url: string;
 category: string;
 tags: string[];
 license_name: string;
 license_url: string;
 commercial_allowed: boolean;
 license_approved: boolean;
 preview_allowed: boolean;
 printability: string;
 visible: boolean;
 available: boolean;
 mesh_asset_id: string | null;
 image_asset_id: string | null;
 starting_price: number | null;
 lead_time_days: number | null;
 search_document: string | null;
 created_at: string;
 updated_at: string;
 showcase_visible: boolean;
 image_permission: string;
};Insert:{
 id?: string;
 name: string;
 description?: string;
 source_kind: string;
 source_url?: string;
 creator: string;
 creator_url?: string;
 category: string;
 tags?: string[];
 license_name: string;
 license_url?: string;
 commercial_allowed?: boolean;
 license_approved?: boolean;
 preview_allowed?: boolean;
 printability?: string;
 visible?: boolean;
 available?: boolean;
 mesh_asset_id?: string | null;
 image_asset_id?: string | null;
 starting_price?: number | null;
 lead_time_days?: number | null;
 search_document?: string | null;
 created_at?: string;
 updated_at?: string;
 showcase_visible?: boolean;
 image_permission?: string;
};Update:{
 id?: string;
 name?: string;
 description?: string;
 source_kind?: string;
 source_url?: string;
 creator?: string;
 creator_url?: string;
 category?: string;
 tags?: string[];
 license_name?: string;
 license_url?: string;
 commercial_allowed?: boolean;
 license_approved?: boolean;
 preview_allowed?: boolean;
 printability?: string;
 visible?: boolean;
 available?: boolean;
 mesh_asset_id?: string | null;
 image_asset_id?: string | null;
 starting_price?: number | null;
 lead_time_days?: number | null;
 search_document?: string | null;
 created_at?: string;
 updated_at?: string;
 showcase_visible?: boolean;
 image_permission?: string;
};Relationships:[]};
customer_files: {Row:{
 id: string;
 owner_id: string;
 path: string;
 sha256: string;
 original_name: string;
 mime: string;
 bytes: number;
 analysis: Json | null;
 kind: string;
 created_at: string;
 generated: boolean;
 purpose: string;
 source_job_id: string | null;
};Insert:{
 id?: string;
 owner_id: string;
 path: string;
 sha256: string;
 original_name: string;
 mime: string;
 bytes: number;
 analysis?: Json | null;
 kind: string;
 created_at?: string;
 generated?: boolean;
 purpose?: string;
 source_job_id?: string | null;
};Update:{
 id?: string;
 owner_id?: string;
 path?: string;
 sha256?: string;
 original_name?: string;
 mime?: string;
 bytes?: number;
 analysis?: Json | null;
 kind?: string;
 created_at?: string;
 generated?: boolean;
 purpose?: string;
 source_job_id?: string | null;
};Relationships:[]};
customer_security_events: {Row:{
 id: string;
 owner_id: string | null;
 kind: string;
 subject_hash: string | null;
 network_hash: string | null;
 suspicious: boolean;
 created_at: string;
};Insert:{
 id?: string;
 owner_id?: string | null;
 kind: string;
 subject_hash?: string | null;
 network_hash?: string | null;
 suspicious?: boolean;
 created_at?: string;
};Update:{
 id?: string;
 owner_id?: string | null;
 kind?: string;
 subject_hash?: string | null;
 network_hash?: string | null;
 suspicious?: boolean;
 created_at?: string;
};Relationships:[]};
customers: {Row:{
 id: string;
 owner_id: string;
 display_name: string | null;
 created_at: string;
};Insert:{
 id?: string;
 owner_id: string;
 display_name?: string | null;
 created_at?: string;
};Update:{
 id?: string;
 owner_id?: string;
 display_name?: string | null;
 created_at?: string;
};Relationships:[]};
filament_spools: {Row:{
 id: string;
 material_id: string;
 supplier: string | null;
 batch: string | null;
 cost_per_kg: number | null;
 remaining_grams: number;
 spool_weight_grams: number | null;
 created_at: string;
};Insert:{
 id?: string;
 material_id: string;
 supplier?: string | null;
 batch?: string | null;
 cost_per_kg?: number | null;
 remaining_grams: number;
 spool_weight_grams?: number | null;
 created_at?: string;
};Update:{
 id?: string;
 material_id?: string;
 supplier?: string | null;
 batch?: string | null;
 cost_per_kg?: number | null;
 remaining_grams?: number;
 spool_weight_grams?: number | null;
 created_at?: string;
};Relationships:[]};
gallery_items: {Row:{
 id: string;
 title: string;
 description: string;
 public: boolean;
 consent_record: string | null;
 image_path: string | null;
 created_at: string;
};Insert:{
 id?: string;
 title: string;
 description?: string;
 public?: boolean;
 consent_record?: string | null;
 image_path?: string | null;
 created_at?: string;
};Update:{
 id?: string;
 title?: string;
 description?: string;
 public?: boolean;
 consent_record?: string | null;
 image_path?: string | null;
 created_at?: string;
};Relationships:[]};
generation_months: {Row:{
 month: string;
 reserved_thb: number;
};Insert:{
 month: string;
 reserved_thb?: number;
};Update:{
 month?: string;
 reserved_thb?: number;
};Relationships:[]};
generation_reservations: {Row:{
 job_id: string;
 month: string;
 amount_thb: number;
 created_at: string;
};Insert:{
 job_id: string;
 month: string;
 amount_thb: number;
 created_at?: string;
};Update:{
 job_id?: string;
 month?: string;
 amount_thb?: number;
 created_at?: string;
};Relationships:[]};
generation_settings: {Row:{
 id: boolean;
 enabled: boolean;
 daily_customer_limit: number;
 monthly_budget_thb: number;
 credit_cost_thb: number | null;
 concurrency: number;
 updated_at: string;
};Insert:{
 id?: boolean;
 enabled?: boolean;
 daily_customer_limit?: number;
 monthly_budget_thb?: number;
 credit_cost_thb?: number | null;
 concurrency?: number;
 updated_at?: string;
};Update:{
 id?: boolean;
 enabled?: boolean;
 daily_customer_limit?: number;
 monthly_budget_thb?: number;
 credit_cost_thb?: number | null;
 concurrency?: number;
 updated_at?: string;
};Relationships:[]};
inventory_reservations: {Row:{
 id: string;
 order_id: string;
 material_id: string;
 grams: number;
 state: string;
 created_at: string;
};Insert:{
 id?: string;
 order_id: string;
 material_id: string;
 grams: number;
 state?: string;
 created_at?: string;
};Update:{
 id?: string;
 order_id?: string;
 material_id?: string;
 grams?: number;
 state?: string;
 created_at?: string;
};Relationships:[]};
inventory_transactions: {Row:{
 id: string;
 material_id: string;
 order_id: string | null;
 delta_grams: number;
 kind: string;
 reason: string;
 created_at: string;
};Insert:{
 id?: string;
 material_id: string;
 order_id?: string | null;
 delta_grams: number;
 kind: string;
 reason: string;
 created_at?: string;
};Update:{
 id?: string;
 material_id?: string;
 order_id?: string | null;
 delta_grams?: number;
 kind?: string;
 reason?: string;
 created_at?: string;
};Relationships:[]};
materials: {Row:{
 id: string;
 name: string;
 color: string;
 hex: string;
 visible: boolean;
 available_grams: number;
 low_stock_grams: number;
 created_at: string;
 reserved_grams: number;
 image_file_id: string | null;
};Insert:{
 id?: string;
 name?: string;
 color: string;
 hex: string;
 visible?: boolean;
 available_grams?: number;
 low_stock_grams?: number;
 created_at?: string;
 reserved_grams?: number;
 image_file_id?: string | null;
};Update:{
 id?: string;
 name?: string;
 color?: string;
 hex?: string;
 visible?: boolean;
 available_grams?: number;
 low_stock_grams?: number;
 created_at?: string;
 reserved_grams?: number;
 image_file_id?: string | null;
};Relationships:[]};
model_license_reviews: {Row:{
 id: string;
 model_id: string;
 reviewer_id: string;
 commercial_allowed: boolean;
 approved: boolean;
 note: string;
 record: Json;
 created_at: string;
};Insert:{
 id?: string;
 model_id: string;
 reviewer_id: string;
 commercial_allowed: boolean;
 approved: boolean;
 note: string;
 record: Json;
 created_at?: string;
};Update:{
 id?: string;
 model_id?: string;
 reviewer_id?: string;
 commercial_allowed?: boolean;
 approved?: boolean;
 note?: string;
 record?: Json;
 created_at?: string;
};Relationships:[]};
model_order_snapshots: {Row:{
 quote_id: string;
 owner_id: string;
 model_id: string;
 metadata: Json;
 created_at: string;
};Insert:{
 quote_id: string;
 owner_id: string;
 model_id: string;
 metadata: Json;
 created_at?: string;
};Update:{
 quote_id?: string;
 owner_id?: string;
 model_id?: string;
 metadata?: Json;
 created_at?: string;
};Relationships:[]};
model_versions: {Row:{
 id: string;
 owner_id: string;
 model_id: string | null;
 file_id: string | null;
 created_at: string;
};Insert:{
 id?: string;
 owner_id: string;
 model_id?: string | null;
 file_id?: string | null;
 created_at?: string;
};Update:{
 id?: string;
 owner_id?: string;
 model_id?: string | null;
 file_id?: string | null;
 created_at?: string;
};Relationships:[]};
models: {Row:{
 id: string;
 owner_id: string;
 file_id: string | null;
 name: string | null;
 created_at: string;
};Insert:{
 id?: string;
 owner_id: string;
 file_id?: string | null;
 name?: string | null;
 created_at?: string;
};Update:{
 id?: string;
 owner_id?: string;
 file_id?: string | null;
 name?: string | null;
 created_at?: string;
};Relationships:[]};
notifications: {Row:{
 id: string;
 owner_id: string;
 order_id: string | null;
 message: string;
 read_at: string | null;
 created_at: string;
};Insert:{
 id?: string;
 owner_id: string;
 order_id?: string | null;
 message: string;
 read_at?: string | null;
 created_at?: string;
};Update:{
 id?: string;
 owner_id?: string;
 order_id?: string | null;
 message?: string;
 read_at?: string | null;
 created_at?: string;
};Relationships:[]};
order_events: {Row:{
 id: string;
 order_id: string;
 owner_id: string;
 actor_id: string | null;
 from_status: OrderStatus | null;
 to_status: OrderStatus;
 note: string;
 created_at: string;
};Insert:{
 id?: string;
 order_id: string;
 owner_id: string;
 actor_id?: string | null;
 from_status?: OrderStatus | null;
 to_status: OrderStatus;
 note?: string;
 created_at?: string;
};Update:{
 id?: string;
 order_id?: string;
 owner_id?: string;
 actor_id?: string | null;
 from_status?: OrderStatus | null;
 to_status?: OrderStatus;
 note?: string;
 created_at?: string;
};Relationships:[]};
orders: {Row:{
 id: string;
 number: number;
 owner_id: string;
 quote_id: string;
 status: OrderStatus;
 final_design_file_id: string | null;
 final_design_approved: boolean;
 created_at: string;
 final_catalog_asset_id: string | null;
};Insert:{
 id?: string;
 number?: number;
 owner_id: string;
 quote_id: string;
 status?: OrderStatus;
 final_design_file_id?: string | null;
 final_design_approved?: boolean;
 created_at?: string;
 final_catalog_asset_id?: string | null;
};Update:{
 id?: string;
 number?: number;
 owner_id?: string;
 quote_id?: string;
 status?: OrderStatus;
 final_design_file_id?: string | null;
 final_design_approved?: boolean;
 created_at?: string;
 final_catalog_asset_id?: string | null;
};Relationships:[]};
payments: {Row:{
 id: string;
 owner_id: string;
 order_id: string;
 file_id: string;
 amount: number;
 verified: boolean;
 request_key: string;
 created_at: string;
};Insert:{
 id?: string;
 owner_id: string;
 order_id: string;
 file_id: string;
 amount: number;
 verified?: boolean;
 request_key: string;
 created_at?: string;
};Update:{
 id?: string;
 owner_id?: string;
 order_id?: string;
 file_id?: string;
 amount?: number;
 verified?: boolean;
 request_key?: string;
 created_at?: string;
};Relationships:[]};
preview_jobs: {Row:{
 id: string;
 owner_id: string;
 file_id: string;
 state: string;
 provider_id: string | null;
 attempts: number;
 max_cost_thb: number;
 error_code: string | null;
 lease_until: string | null;
 next_attempt_at: string;
 started_at: string | null;
 output_file_id: string | null;
 created_at: string;
 cancel_requested: boolean;
 progress: number | null;
 consumed_credits: number | null;
 estimated_credits: number;
 credit_cost_thb: number | null;
 request_key: string;
 poll_failures: number;
 consented_at: string | null;
 consent_version: string | null;
};Insert:{
 id?: string;
 owner_id: string;
 file_id: string;
 state?: string;
 provider_id?: string | null;
 attempts?: number;
 max_cost_thb: number;
 error_code?: string | null;
 lease_until?: string | null;
 next_attempt_at?: string;
 started_at?: string | null;
 output_file_id?: string | null;
 created_at?: string;
 cancel_requested?: boolean;
 progress?: number | null;
 consumed_credits?: number | null;
 estimated_credits?: number;
 credit_cost_thb?: number | null;
 request_key?: string;
 poll_failures?: number;
 consented_at?: string | null;
 consent_version?: string | null;
};Update:{
 id?: string;
 owner_id?: string;
 file_id?: string;
 state?: string;
 provider_id?: string | null;
 attempts?: number;
 max_cost_thb?: number;
 error_code?: string | null;
 lease_until?: string | null;
 next_attempt_at?: string;
 started_at?: string | null;
 output_file_id?: string | null;
 created_at?: string;
 cancel_requested?: boolean;
 progress?: number | null;
 consumed_credits?: number | null;
 estimated_credits?: number;
 credit_cost_thb?: number | null;
 request_key?: string;
 poll_failures?: number;
 consented_at?: string | null;
 consent_version?: string | null;
};Relationships:[]};
pricing_rules: {Row:{
 id: string;
 rates: Json;
 effective_at: string;
 active: boolean;
 created_at: string;
 material_id: string | null;
 service: string | null;
 reviewed: boolean;
};Insert:{
 id?: string;
 rates: Json;
 effective_at?: string;
 active?: boolean;
 created_at?: string;
 material_id?: string | null;
 service?: string | null;
 reviewed?: boolean;
};Update:{
 id?: string;
 rates?: Json;
 effective_at?: string;
 active?: boolean;
 created_at?: string;
 material_id?: string | null;
 service?: string | null;
 reviewed?: boolean;
};Relationships:[]};
pricing_snapshots: {Row:{
 id: string;
 owner_id: string;
 quote_id: string | null;
 rates: Json;
 created_at: string;
};Insert:{
 id?: string;
 owner_id: string;
 quote_id?: string | null;
 rates: Json;
 created_at?: string;
};Update:{
 id?: string;
 owner_id?: string;
 quote_id?: string | null;
 rates?: Json;
 created_at?: string;
};Relationships:[]};
printer_profiles: {Row:{
 id: string;
 name: string;
 volume_mm: number[];
 settings: Json;
 created_at: string;
};Insert:{
 id?: string;
 name: string;
 volume_mm?: number[];
 settings?: Json;
 created_at?: string;
};Update:{
 id?: string;
 name?: string;
 volume_mm?: number[];
 settings?: Json;
 created_at?: string;
};Relationships:[]};
privacy_requests: {Row:{
 id: string;
 owner_id: string;
 kind: string;
 status: string;
 created_at: string;
};Insert:{
 id?: string;
 owner_id: string;
 kind: string;
 status?: string;
 created_at?: string;
};Update:{
 id?: string;
 owner_id?: string;
 kind?: string;
 status?: string;
 created_at?: string;
};Relationships:[]};
production_jobs: {Row:{
 id: string;
 order_id: string;
 printer_id: string | null;
 profile: Json | null;
 slicer_results: Json | null;
 status: string;
 failure_reason: string | null;
 internal_notes: string | null;
 created_at: string;
 actual_cost_thb: number | null;
 actual_labor_thb: number | null;
};Insert:{
 id?: string;
 order_id: string;
 printer_id?: string | null;
 profile?: Json | null;
 slicer_results?: Json | null;
 status?: string;
 failure_reason?: string | null;
 internal_notes?: string | null;
 created_at?: string;
 actual_cost_thb?: number | null;
 actual_labor_thb?: number | null;
};Update:{
 id?: string;
 order_id?: string;
 printer_id?: string | null;
 profile?: Json | null;
 slicer_results?: Json | null;
 status?: string;
 failure_reason?: string | null;
 internal_notes?: string | null;
 created_at?: string;
 actual_cost_thb?: number | null;
 actual_labor_thb?: number | null;
};Relationships:[]};
profiles: {Row:{
 id: string;
 display_name: string | null;
 created_at: string;
};Insert:{
 id: string;
 display_name?: string | null;
 created_at?: string;
};Update:{
 id?: string;
 display_name?: string | null;
 created_at?: string;
};Relationships:[]};
promotion_redemptions: {Row:{
 id: string;
 promotion_id: string;
 owner_id: string;
 quote_id: string;
 created_at: string;
};Insert:{
 id?: string;
 promotion_id: string;
 owner_id: string;
 quote_id: string;
 created_at?: string;
};Update:{
 id?: string;
 promotion_id?: string;
 owner_id?: string;
 quote_id?: string;
 created_at?: string;
};Relationships:[]};
promotions: {Row:{
 id: string;
 name: string;
 kind: string;
 value: number;
 starts_at: string;
 ends_at: string;
 usage_limit: number | null;
 used: number;
 active: boolean;
 minimum_total: number;
 created_at: string;
 allow_below_cost: boolean;
 authorization_note: string;
};Insert:{
 id?: string;
 name: string;
 kind: string;
 value: number;
 starts_at: string;
 ends_at: string;
 usage_limit?: number | null;
 used?: number;
 active?: boolean;
 minimum_total?: number;
 created_at?: string;
 allow_below_cost?: boolean;
 authorization_note?: string;
};Update:{
 id?: string;
 name?: string;
 kind?: string;
 value?: number;
 starts_at?: string;
 ends_at?: string;
 usage_limit?: number | null;
 used?: number;
 active?: boolean;
 minimum_total?: number;
 created_at?: string;
 allow_below_cost?: boolean;
 authorization_note?: string;
};Relationships:[]};
provider_budgets: {Row:{
 day: string;
 limit_thb: number;
 reserved_thb: number;
};Insert:{
 day: string;
 limit_thb?: number;
 reserved_thb?: number;
};Update:{
 day?: string;
 limit_thb?: number;
 reserved_thb?: number;
};Relationships:[]};
provider_reservations: {Row:{
 job_id: string;
 budget_day: string;
 amount: number;
};Insert:{
 job_id: string;
 budget_day: string;
 amount: number;
};Update:{
 job_id?: string;
 budget_day?: string;
 amount?: number;
};Relationships:[]};
quote_cost_reviews: {Row:{
 quote_id: string;
 reviewer_id: string;
 review: Json;
 created_at: string;
};Insert:{
 quote_id: string;
 reviewer_id: string;
 review: Json;
 created_at?: string;
};Update:{
 quote_id?: string;
 reviewer_id?: string;
 review?: Json;
 created_at?: string;
};Relationships:[]};
quote_items: {Row:{
 id: string;
 owner_id: string;
 quote_id: string | null;
 quantity: number;
 description: string | null;
 created_at: string;
};Insert:{
 id?: string;
 owner_id: string;
 quote_id?: string | null;
 quantity: number;
 description?: string | null;
 created_at?: string;
};Update:{
 id?: string;
 owner_id?: string;
 quote_id?: string | null;
 quantity?: number;
 description?: string | null;
 created_at?: string;
};Relationships:[]};
quotes: {Row:{
 id: string;
 owner_id: string;
 request_key: string;
 service: string;
 configuration: Json;
 snapshot: Json;
 estimate: Json;
 status: string;
 final_total: number | null;
 notes: string;
 expires_at: string;
 created_at: string;
};Insert:{
 id?: string;
 owner_id: string;
 request_key: string;
 service: string;
 configuration: Json;
 snapshot: Json;
 estimate: Json;
 status?: string;
 final_total?: number | null;
 notes?: string;
 expires_at?: string;
 created_at?: string;
};Update:{
 id?: string;
 owner_id?: string;
 request_key?: string;
 service?: string;
 configuration?: Json;
 snapshot?: Json;
 estimate?: Json;
 status?: string;
 final_total?: number | null;
 notes?: string;
 expires_at?: string;
 created_at?: string;
};Relationships:[]};
rate_limits: {Row:{
 key: string;
 window_start: string;
 hits: number;
};Insert:{
 key: string;
 window_start?: string;
 hits?: number;
};Update:{
 key?: string;
 window_start?: string;
 hits?: number;
};Relationships:[]};
roles: {Row:{
 user_id: string;
 role: string;
};Insert:{
 user_id: string;
 role: string;
};Update:{
 user_id?: string;
 role?: string;
};Relationships:[]};
settings: {Row:{
 id: string;
 name: string;
 value: Json;
 created_at: string;
};Insert:{
 id?: string;
 name: string;
 value: Json;
 created_at?: string;
};Update:{
 id?: string;
 name?: string;
 value?: Json;
 created_at?: string;
};Relationships:[]};
student_challenges: {Row:{
 owner_id: string;
 email: string;
 code_hash: string;
 expires_at: string;
 attempts: number;
};Insert:{
 owner_id: string;
 email: string;
 code_hash: string;
 expires_at: string;
 attempts?: number;
};Update:{
 owner_id?: string;
 email?: string;
 code_hash?: string;
 expires_at?: string;
 attempts?: number;
};Relationships:[]};
student_discount_redemptions: {Row:{
 quote_id: string;
 rule_id: string;
 verification_id: string;
 created_at: string;
};Insert:{
 quote_id: string;
 rule_id: string;
 verification_id: string;
 created_at?: string;
};Update:{
 quote_id?: string;
 rule_id?: string;
 verification_id?: string;
 created_at?: string;
};Relationships:[]};
student_discount_rules: {Row:{
 id: string;
 name: string;
 kind: string;
 value: number;
 active: boolean;
 starts_at: string;
 ends_at: string;
 minimum_total: number;
 usage_limit: number | null;
 per_identity_limit: number;
 stack_early_bird: boolean;
 minimum_profit: number;
 minimum_margin: number;
 require_enrollment: boolean;
 reverify_days: number;
 created_at: string;
};Insert:{
 id?: string;
 name?: string;
 kind?: string;
 value?: number;
 active?: boolean;
 starts_at?: string;
 ends_at?: string;
 minimum_total?: number;
 usage_limit?: number | null;
 per_identity_limit?: number;
 stack_early_bird?: boolean;
 minimum_profit?: number;
 minimum_margin?: number;
 require_enrollment?: boolean;
 reverify_days?: number;
 created_at?: string;
};Update:{
 id?: string;
 name?: string;
 kind?: string;
 value?: number;
 active?: boolean;
 starts_at?: string;
 ends_at?: string;
 minimum_total?: number;
 usage_limit?: number | null;
 per_identity_limit?: number;
 stack_early_bird?: boolean;
 minimum_profit?: number;
 minimum_margin?: number;
 require_enrollment?: boolean;
 reverify_days?: number;
 created_at?: string;
};Relationships:[]};
student_verification_audit: {Row:{
 id: string;
 owner_id: string;
 actor_id: string | null;
 action: string;
 created_at: string;
};Insert:{
 id?: string;
 owner_id: string;
 actor_id?: string | null;
 action: string;
 created_at?: string;
};Update:{
 id?: string;
 owner_id?: string;
 actor_id?: string | null;
 action?: string;
 created_at?: string;
};Relationships:[]};
student_verifications: {Row:{
 id: string;
 owner_id: string;
 method: string;
 verified_email: string;
 verified_at: string;
 expires_at: string;
 enrollment_status: string | null;
 revoked_at: string | null;
};Insert:{
 id?: string;
 owner_id: string;
 method: string;
 verified_email: string;
 verified_at?: string;
 expires_at: string;
 enrollment_status?: string | null;
 revoked_at?: string | null;
};Update:{
 id?: string;
 owner_id?: string;
 method?: string;
 verified_email?: string;
 verified_at?: string;
 expires_at?: string;
 enrollment_status?: string | null;
 revoked_at?: string | null;
};Relationships:[]};
};Views:Record<string,never>;Functions:{
is_admin:{Args:Record<string,never>;Returns:boolean};
take_rate_limit:{Args:{p_key:string;p_limit:number;p_seconds:number};Returns:boolean};
transition_order:{Args:{p_id:string;p_to:OrderStatus;p_note?:string};Returns:undefined};
inventory_adjust:{Args:{p_material:string;p_delta:number;p_kind:string;p_reason:string;p_order?:string};Returns:undefined};
reserve_promotion:{Args:{p_promo:string;p_quote:string};Returns:boolean};
claim_preview_job:{Args:Record<string,never>;Returns:Database['public']['Tables']['preview_jobs']['Row'][]};
reserve_provider_budget:{Args:{p_job:string};Returns:boolean};
commit_quote:{Args:{p_record:Json;p_promo?:string|null;p_regular?:Json|null};Returns:string};
issue_final_quote:{Args:{p_id:string;p_total:number;p_notes:string;p_design:string|null};Returns:undefined};
reserve_inventory:{Args:{p_order:string;p_material:string;p_grams:number};Returns:undefined};
settle_inventory:{Args:{p_reservation:string;p_consume:boolean};Returns:undefined};
operations_metrics:{Args:Record<string,never>;Returns:Json};
configure_generation:{Args:{p_enabled:boolean;p_daily:number;p_monthly:number;p_credit:number|null;p_concurrency:number};Returns:undefined};
enqueue_generation:{Args:{p_owner:string;p_file:string;p_request:string};Returns:string};
start_generation:{Args:{p_job:string};Returns:boolean};
retry_generation:{Args:{p_id:string};Returns:undefined};
publish_catalog_thumbnail:{Args:{p_model:string;p_asset:string;p_permission:string;p_note:string};Returns:undefined};
submit_catalog_inquiry:{Args:{p_model:string;p_request:string;p_customer:Json;p_selection:Json};Returns:string};
generation_metrics:{Args:Record<string,never>;Returns:Json};
save_catalog_model:{Args:{p_id:string;p_values:Json};Returns:string};
catalog_categories:{Args:Record<string,never>;Returns:Json};
browse_catalog:{Args:{p_seed:string;p_page?:number;p_query?:string;p_category?:string;p_min?:number|null;p_max?:number|null};Returns:Json};
customer_session_active:{Args:{p_session:string;p_owner:string};Returns:boolean};
verify_student:{Args:{p_owner:string;p_email:string;p_method?:string;p_enrollment?:string|null;p_expires?:string|null};Returns:undefined};
consume_student_challenge:{Args:{p_owner:string;p_hash:string};Returns:string|null};
student_price:{Args:{p_owner:string;p_estimate:Json;p_snapshot:Json;p_reserve?:boolean;p_quote?:string|null};Returns:Json};
prune_customer_security:{Args:Record<string,never>;Returns:undefined};
revoke_student:{Args:{p_id:string;p_restore?:boolean};Returns:undefined};
};Enums:{order_status:OrderStatus};CompositeTypes:Record<string,never>}};
export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
