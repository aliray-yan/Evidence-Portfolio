import type { AnalyzeResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export async function analyzeImage(file: File): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("image", file);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/analyze`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new ApiError(
      0,
      "Couldn't reach the analysis service. Check that the backend is running and try again."
    );
  }

  if (!response.ok) {
    let message = "Something went wrong while analyzing your image. Please try again.";
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") message = body.detail;
      else if (typeof body?.message === "string") message = body.message;
    } catch {
      // response wasn't JSON — keep the default message rather than surfacing raw text
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as AnalyzeResponse;
}
