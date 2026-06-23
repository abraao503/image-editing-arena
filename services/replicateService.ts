import { ModelConfig } from "../types";

const SLEEP_MS = 1500; // Poll interval

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Use our own Cloudflare Worker as a proxy to avoid CORS issues
// The worker proxies requests to the Replicate API server-side
const API_BASE = "/api/replicate";

interface Prediction {
  id: string;
  status: string;
  output?: string | string[];
  error?: string;
  urls: {
    get: string;
    cancel: string;
  };
}

export const createPrediction = async (
  apiKey: string,
  model: ModelConfig,
  input: {
    prompt: string;
    images?: string[];
    aspect_ratio?: string;
    loraWeights?: string;
  },
): Promise<Prediction> => {
  const payloadInput: any = {
    prompt: input.prompt,
    output_format: "png",
  };

  if (input.aspect_ratio) {
    payloadInput.aspect_ratio = input.aspect_ratio;
  }

  // Map input images according to each model's expected param/shape,
  // capped at the maximum the model accepts.
  const images = (input.images || []).filter(Boolean);
  if (images.length > 0) {
    const limited = images.slice(0, model.maxImages);
    switch (model.imageInputMode) {
      case "image_input":
        payloadInput.image_input = limited;
        break;
      case "input_images":
        payloadInput.input_images = limited;
        break;
      case "image_array":
        payloadInput.image = limited;
        break;
      case "image_string":
        payloadInput.image = limited[0];
        break;
    }
  }

  // Disable the safety checker on models that support that exact param.
  if (model.supportsSafetyChecker) {
    payloadInput.disable_safety_checker = true;
  }

  // Apply LoRA weights only to models that support it (Qwen LoRA explorer).
  if (model.supportsLora && input.loraWeights && input.loraWeights.trim()) {
    payloadInput.lora_weights = input.loraWeights.trim();
  }

  // Use our worker proxy endpoint
  const url = `${API_BASE}/v1/models/${model.owner}/${model.name}/predictions`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: payloadInput }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      if (response.status === 404) {
        throw new Error(
          `Model not found (${model.owner}/${model.name}). Check model ID.`,
        );
      }
      if (response.status === 401) {
        throw new Error("Invalid API Key.");
      }
      if (response.status === 422) {
        throw new Error(`Invalid inputs for this model.`);
      }
      throw new Error(`Replicate Error (${response.status}): ${errorBody}`);
    }

    const prediction = await response.json();
    return prediction;
  } catch (err: any) {
    if (err.message === "Failed to fetch") {
      throw new Error(
        "Network error. Please check your connection and try again.",
      );
    }
    throw err;
  }
};

export const pollPrediction = async (
  apiKey: string,
  predictionUrl: string,
): Promise<Prediction> => {
  // Convert the full Replicate URL to use our worker proxy
  // predictionUrl is like: https://api.replicate.com/v1/predictions/xxx
  const proxyPath = predictionUrl.replace(
    "https://api.replicate.com",
    API_BASE,
  );

  while (true) {
    const response = await fetch(proxyPath, {
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        await sleep(SLEEP_MS * 2);
        continue;
      }
      throw new Error(`Polling failed: ${response.status}`);
    }

    const prediction = await response.json();

    if (prediction.status === "succeeded") {
      return prediction;
    } else if (
      prediction.status === "failed" ||
      prediction.status === "canceled"
    ) {
      throw new Error(
        `Prediction ${prediction.status}: ${prediction.error || "Unknown error"}`,
      );
    }

    await sleep(SLEEP_MS);
  }
};
