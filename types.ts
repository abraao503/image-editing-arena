// How a model expects input images to be passed in its payload
export type ImageInputMode =
  | "image_input" // image_input: string[]
  | "input_images" // input_images: string[]
  | "image_array" // image: string[]
  | "image_string"; // image: string (single)

export interface ModelConfig {
  id: string;
  name: string;
  owner: string;
  version?: string; // Optional specific version hash
  type: "image-generation" | "image-editing";
  description: string;
  price: number;
  imageInputMode: ImageInputMode;
  maxImages: number; // Maximum number of input images accepted
  supportsAspectRatio?: boolean; // Accepts aspect_ratio
  matchInputViaBoolean?: boolean; // "match input" is a separate boolean (match_input_image) instead of aspect_ratio="match_input_image"
  supportsOutputFormat?: boolean; // Accepts output_format
  supportsSafetyChecker?: boolean; // Accepts disable_safety_checker
  supportsLora?: boolean; // Accepts lora_weights
}

export interface PredictionResult {
  modelId: string;
  status: "idle" | "starting" | "processing" | "succeeded" | "failed";
  output?: string | string[]; // URL or array of URLs
  error?: string;
  inferenceTime?: number; // in seconds
}

export interface PredictionStats {
  modelId: string;
  time: number;
}
