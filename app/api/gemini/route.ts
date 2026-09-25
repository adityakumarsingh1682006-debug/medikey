import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SummaryRequest = {
  patientName?: string;
  emergencyProfile?: {
    blood_group?: string | null;
    allergies?: string | null;
    critical_medications?: string | null;
    medical_conditions?: string | null;
    emergency_notes?: string | null;
  };
  records?: Array<{
    title?: string | null;
    record_type?: string | null;
    record_date?: string | null;
  }>;
};

type GeminiSummary = {
  headline: string;
  summary: string;
  criticalAlerts: string[];
  medications: string[];
  conditions: string[];
  verificationNote: string;
};

function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0
    )
    .map((item) => item.trim());
}

function normalizeSummary(value: unknown): GeminiSummary {
  const data =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    headline:
      clean(data.headline) || "Emergency Medical Summary",

    summary:
      clean(data.summary) ||
      "No additional summary could be generated.",

    criticalAlerts: cleanStringArray(data.criticalAlerts),

    medications: cleanStringArray(data.medications),

    conditions: cleanStringArray(data.conditions),

    verificationNote:
      clean(data.verificationNote) ||
      "AI-generated summary. Verify all information against the original medical records.",
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(
        "Medi Key Gemini error: GEMINI_API_KEY is missing."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini API key is not configured. Make sure GEMINI_API_KEY exists in .env.local and restart the development server.",
        },
        { status: 500 }
      );
    }

    let body: SummaryRequest;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const patientName = clean(body.patientName) || "Patient";

    const emergencyProfile = body.emergencyProfile ?? {};

    const records = Array.isArray(body.records)
      ? body.records
      : [];

    /*
     * Only information deliberately supplied by the already-authorized
     * hospital records page is sent to Gemini.
     *
     * Never send:
     * - passwords
     * - API keys
     * - Supabase auth tokens
     * - unrelated account information
     */

    const recordText =
      records.length > 0
        ? records
            .map((record, index) => {
              const title =
                clean(record.title) || "Untitled record";

              const type =
                clean(record.record_type) || "Unknown type";

              const date =
                clean(record.record_date) ||
                "Date unavailable";

              return `${index + 1}. ${title} | Type: ${type} | Date: ${date}`;
            })
            .join("\n")
        : "No medical record metadata was provided.";

    const medicalInformation = `
PATIENT
Name: ${patientName}

EMERGENCY INFORMATION
Blood group: ${
      clean(emergencyProfile.blood_group) || "Not provided"
    }

Allergies: ${
      clean(emergencyProfile.allergies) || "Not provided"
    }

Critical medications: ${
      clean(emergencyProfile.critical_medications) ||
      "Not provided"
    }

Medical conditions: ${
      clean(emergencyProfile.medical_conditions) ||
      "Not provided"
    }

Emergency notes: ${
      clean(emergencyProfile.emergency_notes) ||
      "Not provided"
    }

AUTHORIZED MEDICAL RECORD METADATA
${recordText}
`.trim();

    const prompt = `
You are generating an emergency medical information summary for Medi Key.

Your task is ONLY to summarize information explicitly provided in the supplied patient information.

STRICT SAFETY RULES:

1. Do not diagnose the patient.
2. Do not recommend treatment.
3. Do not recommend medication changes.
4. Do not infer diseases, allergies, medications, or conditions.
5. Do not invent information.
6. Do not assume missing information means the patient does not have a condition.
7. Preserve important documented allergies, medications, conditions, and emergency warnings.
8. If information is missing, use "Not provided" where appropriate.
9. Keep the summary concise and useful to authorized healthcare staff.
10. Do not claim this summary replaces the original medical records.
11. The original medical records must always be considered the authoritative source.
12. Use plain professional language.
13. The medical record information may contain only metadata such as title,
    type, and date. Do NOT pretend that the contents of those records
    were reviewed if only metadata was supplied.
14. This is a decision-support summary only and not a diagnosis.

Patient information:

${medicalInformation}
`.trim();

    /*
     * Gemini 3.8 Flash
     *
     * Structured JSON output is requested so that the application
     * receives predictable data.
     */

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },

        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],

          generationConfig: {
            responseMimeType: "application/json",

            responseSchema: {
              type: "OBJECT",

              properties: {
                headline: {
                  type: "STRING",
                },

                summary: {
                  type: "STRING",
                },

                criticalAlerts: {
                  type: "ARRAY",
                  items: {
                    type: "STRING",
                  },
                },

                medications: {
                  type: "ARRAY",
                  items: {
                    type: "STRING",
                  },
                },

                conditions: {
                  type: "ARRAY",
                  items: {
                    type: "STRING",
                  },
                },

                verificationNote: {
                  type: "STRING",
                },
              },

              required: [
                "headline",
                "summary",
                "criticalAlerts",
                "medications",
                "conditions",
                "verificationNote",
              ],
            },
          },
        }),
      }
    );

    const geminiData = await response.json();

    /*
     * Return Gemini's actual error to the frontend.
     * This prevents the UI from hiding the useful error.
     */

    if (!response.ok) {
      console.error(
        "Medi Key Gemini API error:",
        JSON.stringify(geminiData, null, 2)
      );

      const apiError =
        geminiData?.error?.message ||
        geminiData?.error?.status ||
        `Gemini API request failed with HTTP ${response.status}.`;

      return NextResponse.json(
        {
          success: false,
          error: apiError,
        },
        {
          status: response.status >= 400
            ? response.status
            : 502,
        }
      );
    }

    const generatedText =
      geminiData?.candidates?.[0]?.content?.parts
        ?.map(
          (part: { text?: string }) =>
            typeof part?.text === "string"
              ? part.text
              : ""
        )
        .join("")
        .trim() || "";

    /*
     * Gemini may return no usable candidate if the request
     * is blocked or generation fails.
     */

    if (!generatedText) {
      const finishReason =
        geminiData?.candidates?.[0]?.finishReason;

      const blockReason =
        geminiData?.promptFeedback?.blockReason;

      console.error(
        "Medi Key Gemini empty response:",
        JSON.stringify(
          {
            finishReason,
            blockReason,
            geminiData,
          },
          null,
          2
        )
      );

      return NextResponse.json(
        {
          success: false,

          error: blockReason
            ? `Gemini blocked the request: ${blockReason}.`
            : finishReason
              ? `Gemini did not return usable content. Finish reason: ${finishReason}.`
              : "Gemini returned an empty response.",
        },
        { status: 502 }
      );
    }

    let parsedSummary: unknown;

    try {
      parsedSummary = JSON.parse(generatedText);
    } catch {
      console.error(
        "Medi Key Gemini returned invalid JSON:",
        generatedText
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini returned an unexpected response format.",
        },
        { status: 502 }
      );
    }

    const summary = normalizeSummary(parsedSummary);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error(
      "Medi Key Gemini route error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while generating the AI summary.",
      },
      { status: 500 }
    );
  }
}