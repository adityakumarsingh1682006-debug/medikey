import { NextResponse } from "next/server";

export const runtime = "nodejs";

/*
 * Gemini fallback order.
 *
 * If one model is temporarily overloaded, MediKey automatically
 * tries the next available model.
 */
const GEMINI_MODELS = [
  // Fastest suitable model first for emergency document extraction.
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
];

const MAX_DOCUMENTS = 4;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 6 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type EmergencyProfile = {
  blood_group?: string | null;
  allergies?: string | null;
  critical_medications?: string | null;
  medical_conditions?: string | null;
  emergency_notes?: string | null;
};

type RecordItem = {
  title?: string | null;
  record_type?: string | null;
  record_date?: string | null;
};

type DocumentInput = {
  title?: string | null;
  record_type?: string | null;
  record_date?: string | null;
  mimeType?: string | null;
  signedUrl?: string | null;
};

type AISummary = {
  headline: string;
  summary: string;
  criticalAlerts: string[];
  medications: string[];
  conditions: string[];
  documentFindings: string[];
  documentsProcessed: number;
  documentsSkipped: string[];
  verificationNote: string;
  modelUsed?: string;
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => cleanString(item))
    .filter(Boolean);
}

function normalizeSummary(
  summary: any,
  documentsProcessed = 0,
  documentsSkipped: string[] = [],
  modelUsed = ""
): AISummary {
  return {
    headline:
      cleanString(summary?.headline) ||
      "Emergency medical overview",

    summary:
      cleanString(summary?.summary) ||
      "No additional summary was generated.",

    criticalAlerts: cleanArray(summary?.criticalAlerts),

    medications: cleanArray(summary?.medications),

    conditions: cleanArray(summary?.conditions),

    documentFindings: cleanArray(
      summary?.documentFindings
    ),

    documentsProcessed:
      typeof summary?.documentsProcessed === "number"
        ? summary.documentsProcessed
        : documentsProcessed,

    documentsSkipped: [
      ...cleanArray(summary?.documentsSkipped),
      ...documentsSkipped,
    ],

    verificationNote:
      cleanString(summary?.verificationNote) ||
      "Verify all information against the original medical records before making clinical decisions.",

    modelUsed:
      cleanString(summary?.modelUsed) ||
      modelUsed ||
      undefined,
  };
}

function createFallbackSummary(
  patientName: string,
  emergencyProfile: EmergencyProfile,
  records: RecordItem[]
): AISummary {
  const criticalAlerts: string[] = [];
  const medications: string[] = [];
  const conditions: string[] = [];
  const documentFindings: string[] = [];

  const allergies = cleanString(
    emergencyProfile.allergies
  );

  const criticalMedications = cleanString(
    emergencyProfile.critical_medications
  );

  const medicalConditions = cleanString(
    emergencyProfile.medical_conditions
  );

  const emergencyNotes = cleanString(
    emergencyProfile.emergency_notes
  );

  if (allergies) {
    criticalAlerts.push(
      `Allergies: ${allergies}`
    );
  }

  if (criticalMedications) {
    medications.push(
      criticalMedications
    );
  }

  if (medicalConditions) {
    conditions.push(
      medicalConditions
    );
  }

  if (emergencyNotes) {
    criticalAlerts.push(
      `Emergency notes: ${emergencyNotes}`
    );
  }

  for (const record of records) {
    const title = cleanString(
      record.title
    );

    const type = cleanString(
      record.record_type
    );

    const date = cleanString(
      record.record_date
    );

    if (title || type || date) {
      const parts = [
        title || "Medical document",
        type ? `Type: ${type}` : "",
        date ? `Date: ${date}` : "",
      ].filter(Boolean);

      documentFindings.push(
        `Document available: ${parts.join(" • ")}`
      );
    }
  }

  return {
    headline: `${
      patientName || "Patient"
    } — emergency overview`,

    summary:
      "This overview is generated directly from the documented MediKey emergency profile. Uploaded medical documents were not interpreted because all available AI models were temporarily unavailable.",

    criticalAlerts,

    medications,

    conditions,

    documentFindings,

    documentsProcessed: 0,

    documentsSkipped:
      records.length > 0
        ? [
            "Document analysis was unavailable. Verify the original medical documents.",
          ]
        : [],

    verificationNote:
      "AI document analysis was temporarily unavailable. This fallback is generated directly from documented MediKey information and is not an AI-generated clinical assessment. Verify the original medical records before making clinical decisions.",

    modelUsed: undefined,
  };
}

/**
 * Only allow signed URLs belonging to the configured
 * Supabase project.
 */
function isAllowedSignedUrl(
  urlString: string
): boolean {
  try {
    const url = new URL(urlString);

    if (url.protocol !== "https:") {
      return false;
    }

    const configuredSupabaseUrl =
      cleanString(
        process.env.NEXT_PUBLIC_SUPABASE_URL
      );

    if (!configuredSupabaseUrl) {
      return false;
    }

    const supabaseUrl = new URL(
      configuredSupabaseUrl
    );

    return (
      url.hostname ===
        supabaseUrl.hostname &&
      url.origin === supabaseUrl.origin
    );
  } catch {
    return false;
  }
}

function normalizeMimeType(
  value: string
): string {
  return cleanString(value)
    .toLowerCase()
    .split(";")[0];
}

async function downloadDocument(
  document: DocumentInput
): Promise<{
  title: string;
  recordType: string;
  recordDate: string;
  mimeType: string;
  data: string;
  byteLength: number;
}> {
  const title =
    cleanString(document.title) ||
    "Medical document";

  const recordType =
    cleanString(document.record_type) ||
    "Medical document";

  const recordDate =
    cleanString(document.record_date);

  const mimeType =
    normalizeMimeType(
      cleanString(document.mimeType)
    );

  const signedUrl =
    cleanString(document.signedUrl);

  if (!signedUrl) {
    throw new Error(
      `${title}: missing authorized document URL.`
    );
  }

  if (!isAllowedSignedUrl(signedUrl)) {
    throw new Error(
      `${title}: document URL was rejected for security reasons.`
    );
  }

  if (
    !ALLOWED_MIME_TYPES.has(mimeType)
  ) {
    throw new Error(
      `${title}: unsupported document type (${mimeType || "unknown"}).`
    );
  }

  const response = await fetch(
    signedUrl,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `${title}: document download failed with HTTP ${response.status}.`
    );
  }

  const contentLengthHeader =
    response.headers.get(
      "content-length"
    );

  if (contentLengthHeader) {
    const contentLength =
      Number(contentLengthHeader);

    if (
      Number.isFinite(
        contentLength
      ) &&
      contentLength >
        MAX_DOCUMENT_BYTES
    ) {
      throw new Error(
        `${title}: document is larger than the 8 MB analysis limit.`
      );
    }
  }

  const arrayBuffer =
    await response.arrayBuffer();

  const byteLength =
    arrayBuffer.byteLength;

  if (byteLength === 0) {
    throw new Error(
      `${title}: document is empty.`
    );
  }

  if (
    byteLength >
    MAX_DOCUMENT_BYTES
  ) {
    throw new Error(
      `${title}: document is larger than the 8 MB analysis limit.`
    );
  }

  const data =
    Buffer.from(
      arrayBuffer
    ).toString("base64");

  return {
    title,
    recordType,
    recordDate,
    mimeType,
    data,
    byteLength,
  };
}

/**
 * Build the actual document payload once.
 *
 * This is important because we don't want to download
 * the patient's documents again for every Gemini model.
 */
async function prepareDocuments(
  documents: DocumentInput[]
) {
  const documentParts: any[] = [];
  let totalBytes = 0;
  let processedDocuments = 0;
  const skippedDocuments: string[] = [];

  const limitedDocuments = documents.slice(0, MAX_DOCUMENTS);

  if (documents.length > MAX_DOCUMENTS) {
    skippedDocuments.push(
      `${documents.length - MAX_DOCUMENTS} document(s) were skipped because the analysis limit is ${MAX_DOCUMENTS} documents per request.`
    );
  }

  // Download the small set of authorized documents in parallel. This is much
  // faster than waiting for each signed URL/document to finish sequentially.
  const results = await Promise.allSettled(
    limitedDocuments.map((document) => downloadDocument(document))
  );

  for (const result of results) {
    if (result.status === "rejected") {
      skippedDocuments.push(
        result.reason instanceof Error
          ? result.reason.message
          : "A medical document could not be processed."
      );
      continue;
    }

    const downloaded = result.value;

    if (totalBytes + downloaded.byteLength > MAX_TOTAL_BYTES) {
      skippedDocuments.push(
        `${downloaded.title}: skipped because the combined document analysis limit was reached.`
      );
      continue;
    }

    totalBytes += downloaded.byteLength;
    processedDocuments += 1;

    documentParts.push({
      text: [
        "SOURCE DOCUMENT",
        `Title: ${downloaded.title}`,
        `Type: ${downloaded.recordType}`,
        `Date: ${downloaded.recordDate || "Not provided"}`,
        "Read this authorized document and report only clearly documented facts.",
      ].join("\n"),
    });

    documentParts.push({
      inline_data: {
        mime_type: downloaded.mimeType,
        data: downloaded.data,
      },
    });
  }

  return {
    documentParts,
    processedDocuments,
    skippedDocuments,
  };
}

function buildPrompt(
  patientName: string,
  emergencyProfile: EmergencyProfile,
  records: RecordItem[]
) {
  const recordsMetadata = records
    .map(
      (record, index) =>
        `Record ${index + 1}: ${cleanString(record.title) || "Not provided"} | ` +
        `Type: ${cleanString(record.record_type) || "Not provided"} | ` +
        `Date: ${cleanString(record.record_date) || "Not provided"}`
    )
    .join("\n");

  return `
You are assisting a healthcare professional reviewing an authorized MediKey patient.
Create a concise emergency-oriented summary from ONLY the documented profile and attached medical PDFs/images.

PATIENT: ${patientName || "Not provided"}

EMERGENCY PROFILE
Blood group: ${emergencyProfile.blood_group || "Not provided"}
Allergies: ${emergencyProfile.allergies || "Not provided"}
Critical medications: ${emergencyProfile.critical_medications || "Not provided"}
Medical conditions: ${emergencyProfile.medical_conditions || "Not provided"}
Emergency notes: ${emergencyProfile.emergency_notes || "Not provided"}

RECORD METADATA
${recordsMetadata || "No record metadata provided."}

DOCUMENT RULES
- Inspect the actual attached PDFs/images, not just filenames.
- Extract only clearly visible/explicitly documented facts: diagnoses, medicines, allergies, procedures, hospitalizations, lab names/values/units, observations, and relevant history.
- Every document finding must name its source document.
- If text is blurry or uncertain, say it is unreadable; never guess.
- Do not diagnose from lab values or images.
- Do not infer diseases.
- Do not recommend treatment or medication changes.
- Do not invent missing information.
- Original records remain the source of truth.

Return ONLY the requested JSON structure.
`;
}

function buildGeminiBody(
  prompt: string,
  documentParts: any[]
) {
  return {
    contents: [
      {
        role: "user",

        parts: [
          {
            text: prompt,
          },

          ...documentParts,
        ],
      },
    ],

    generationConfig: {
      maxOutputTokens: 700,
      responseMimeType:
        "application/json",

      responseSchema: {
        type: "object",

        properties: {
          headline: {
            type: "string",
          },

          summary: {
            type: "string",
          },

          criticalAlerts: {
            type: "array",

            items: {
              type: "string",
            },
          },

          medications: {
            type: "array",

            items: {
              type: "string",
            },
          },

          conditions: {
            type: "array",

            items: {
              type: "string",
            },
          },

          documentFindings: {
            type: "array",

            items: {
              type: "string",
            },
          },

          documentsProcessed: {
            type: "number",
          },

          documentsSkipped: {
            type: "array",

            items: {
              type: "string",
            },
          },

          verificationNote: {
            type: "string",
          },
        },

        required: [
          "headline",
          "summary",
          "criticalAlerts",
          "medications",
          "conditions",
          "documentFindings",
          "documentsProcessed",
          "documentsSkipped",
          "verificationNote",
        ],
      },
    },
  };
}

async function callGeminiModel(
  apiKey: string,
  model: string,
  body: any
) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-goog-api-key":
            apiKey,
        },

        body: JSON.stringify(
          body
        ),
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        `Gemini ${model} request failed with status ${response.status}.`
    );
  }

  const candidate =
    data?.candidates?.[0];

  const text =
    candidate?.content?.parts
      ?.map(
        (part: any) =>
          part?.text || ""
      )
      .join("")
      .trim() || "";

  if (!text) {
    throw new Error(
      data?.promptFeedback
        ?.blockReason ||
        candidate?.finishReason ||
        `Gemini ${model} returned an empty response.`
    );
  }

  let parsed: any;

  try {
    parsed =
      JSON.parse(text);
  } catch {
    throw new Error(
      `Gemini ${model} returned invalid JSON.`
    );
  }

  return parsed;
}

async function callGeminiWithFallbacks(
  apiKey: string,
  patientName: string,
  emergencyProfile: EmergencyProfile,
  records: RecordItem[],
  documents: DocumentInput[]
) {
  /*
   * Download the documents only once.
   */
  const prepared =
    await prepareDocuments(
      documents
    );

  /*
   * If no documents could be downloaded,
   * we still let Gemini summarize the emergency profile.
   */
  const prompt =
    buildPrompt(
      patientName,
      emergencyProfile,
      records
    );

  const body =
    buildGeminiBody(
      prompt,
      prepared.documentParts
    );

  const modelErrors: string[] = [];

  /*
   * Try each model in order.
   */
  for (
    const model of GEMINI_MODELS
  ) {
    try {
      console.log(
        `[MediKey AI] Trying ${model}...`
      );

      const parsed =
        await callGeminiModel(
          apiKey,
          model,
          body
        );

      console.log(
        `[MediKey AI] Success with ${model}`
      );

      return normalizeSummary(
        parsed,
        prepared.processedDocuments,
        prepared.skippedDocuments,
        model
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown Gemini error.";

      console.warn(
        `[MediKey AI] ${model} failed:`,
        message
      );

      modelErrors.push(
        `${model}: ${message}`
      );
    }
  }

  /*
   * Every model failed.
   */
  throw new Error(
    `All Gemini models were unavailable.\n${modelErrors.join(
      "\n"
    )}`
  );
}

export async function POST(
  request: Request
) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,

          error:
            "GEMINI_API_KEY is not configured.",
        },

        {
          status: 500,
        }
      );
    }

    const body =
      await request.json();

    const patientName =
      cleanString(
        body?.patientName
      );

    const emergencyProfile: EmergencyProfile =
      body?.emergencyProfile ||
      {};

    const records: RecordItem[] =
      Array.isArray(
        body?.records
      )
        ? body.records
        : [];

    const documents: DocumentInput[] =
      Array.isArray(
        body?.documents
      )
        ? body.documents
        : [];

    try {
      const summary =
        await callGeminiWithFallbacks(
          apiKey,
          patientName,
          emergencyProfile,
          records,
          documents
        );

      return NextResponse.json({
        success: true,

        summary: {
          ...summary,

          isFallback: false,
        },
      });
    } catch (geminiError) {
      console.warn(
        "All Gemini document-analysis models failed:",
        geminiError
      );

      const fallback =
        createFallbackSummary(
          patientName,
          emergencyProfile,
          records
        );

      if (
        geminiError instanceof Error
      ) {
        fallback.documentsSkipped = [
          ...fallback.documentsSkipped,

          `DEBUG: ${geminiError.message}`,
        ];
      }

      return NextResponse.json({
        success: true,

        summary: {
          ...fallback,

          isFallback: true,
        },

        warning:
          geminiError instanceof Error
            ? geminiError.message
            : "Gemini is temporarily unavailable.",
      });
    }
  } catch (error) {
    console.error(
      "Emergency summary API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to generate emergency summary.",
      },

      {
        status: 500,
      }
    );
  }
}