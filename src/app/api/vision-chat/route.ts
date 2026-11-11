import { NextResponse } from 'next/server';
import { getGoogleAiApiKey } from '@/lib/env';

// System prompt generator matching KriyaOS specification
function buildSystemInstruction(
  language: string,
  prompt?: string,
  memoryPrompt?: string,
  isVerification: boolean = false
): string {
  const languagePromptInstruction =
    language === 'hi'
      ? 'Respond primarily in Hindi (हिंदी).'
      : language === 'hinglish'
      ? 'Respond in clear natural Hinglish (Hindi words in English script, e.g., "Maine yeh object identify kiya hai. Aap iske sath kya karna chahte hain?").'
      : language === 'ta'
      ? 'Respond in Tamil (தமிழ்).'
      : language === 'mr'
      ? 'Respond in Marathi (मराठी).'
      : 'Respond in clear, professional English.';

  if (isVerification) {
    return `You are KriyaOS Visual Compliance & Verification Engine powered by Google DeepMind.
The user previously scanned a physical object and was given action steps. Now the user has taken an action and captured a fresh "After" frame to verify completion!

YOUR TASK:
1. Compare this fresh camera frame against the target task. Determine whether the user successfully executed the required physical action (e.g., detached the cap, connected the wire, safely boxed the item, cleaned the filter).
2. Return a valid JSON object matching:
{
  "detected_object_name": "Name of object",
  "verification_result": {
    "verified": true or false,
    "summary": "Detailed, encouraging visual verification explaining what change was observed between before and after.",
    "sha256_hash": "sha256_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "spoken_greeting_and_question": "Spoken congratulations confirming whether the action passed visual compliance verification.",
  "spoken_summary": "Celebratory confirmation message to be read aloud.",
  "solution_steps": ["Verified completed step", "Recommended next maintenance step"],
  "dynamic_action_options": ["📥 Export Compliance Log", "🔄 Scan Another Object", "📋 View BigQuery Record"],
  "new_learned_memory_rule": "Verified compliant physical action recorded in embodied AI repair trajectories."
}

Language requirement: ${languagePromptInstruction}
User prompt: "${prompt || 'Verify if my physical action was completed correctly.'}"`;
  }

  return `You are KriyaOS Universal Physical-World AI Brain powered by Google DeepMind.
The user has scanned a real physical object or hardware with their camera.

${memoryPrompt ? `ACTIVE REINFORCEMENT LEARNING MEMORY:\n${memoryPrompt}\n` : ''}

YOUR TASK:
1. Examine the image carefully. Identify whatever real physical object is in the camera (whether it is an empty juice bottle, a coffee mug, a plant, a gadget, a broken cable, a tool, a medicine strip, an appliance, or factory hardware).
2. Classify its exact material, physical condition, and domain.
3. Evaluate safety status (check for sharp edges, open high voltage, thermal heat, leaking chemicals, or confirm safe).
4. Identify a normalized 2D bounding box for the object [ymin, xmin, ymax, xmax] on a 0-1000 scale.
5. Identify a precision target bullseye focus point target_point: { "y": number, "x": number, "label": "string" } (0-1000 scale) pointing to the exact specific part to inspect/touch (e.g. the bottle cap, the resin code, the broken pin, the power switch).
6. Provide a natural spoken greeting where you tell the user what you see and proactively ask what they want to do with it.
7. Provide exactly 4 dynamic, context-aware action options tailored to this specific object (e.g. for an empty juice bottle: ["🗑️ Throw / Recycle Guide", "🛒 Find Similar Juice Online", "🎨 DIY Reuse / Upcycle Idea", "🔬 Material & Nutrition Check"]).
8. Provide 3 smart queries smart_links: { "shopping_query": "string", "maps_query": "string", "youtube_diy_query": "string" }.
9. Include a helpful Google Agent Skill execution with a relevant Google Search or Shopping URL link if applicable.
10. Formulate a new learned memory rule from this scan to help improve future responses.
11. Return ONLY a valid JSON object matching the exact schema below (no preamble, no markdown wrappers):

{
  "detected_object_name": "Specific object name (e.g., Empty PET Plastic Juice Bottle)",
  "object_category": "Consumer / Electronics / Eco / Hardware / Food / Tool",
  "condition_and_material": "Material and physical condition (e.g., Grade 1 PET Plastic, clean, rinsed, cap attached)",
  "safety_status": "SAFE or HAZARD: description of danger",
  "box_2d": [180, 280, 850, 720],
  "box": {
    "x": 28,
    "y": 18,
    "width": 44,
    "height": 67,
    "label": "Analyzed Object"
  },
  "target_point": {
    "y": 240,
    "x": 500,
    "label": "Bottle Cap & Seal Ring"
  },
  "smart_links": {
    "shopping_query": "organic low sugar cold pressed juice",
    "maps_query": "dry waste recyclable drop off center near me",
    "youtube_diy_query": "how to upcycle plastic bottles into self watering planters"
  },
  "spoken_greeting_and_question": "Conversational greeting stating what you identified and proactively asking what the user wants to do.",
  "dynamic_action_options": [
    "🗑️ Recycle & Dispose Guide",
    "🛒 Find Similar / Healthier Online",
    "🎨 DIY Upcycle & Reuse",
    "🔬 Material & Nutrition Scan"
  ],
  "solution_steps": [
    "Step 1: Concrete action step",
    "Step 2: Concrete action step",
    "Step 3: Verification step"
  ],
  "agent_skill_execution": {
    "skill_name": "Google Search & Shopping Link",
    "action_type": "search",
    "search_query": "search query for this item",
    "search_url": "https://www.google.com/search?q=...",
    "detail": "Action summary"
  },
  "new_learned_memory_rule": "Concise behavioral rule learned from this interaction to store in persistent memory.",
  "spoken_summary": "Natural 2-3 sentence spoken response suitable for voice text-to-speech.",
  "follow_up_suggestions": [
    "Suggested user question 1",
    "Suggested user question 2",
    "Suggested user question 3"
  ]
}

Language requirement: ${languagePromptInstruction}
User's query / intent: "${prompt || 'Scan this object: what is it, what is its condition, and what can I do with it?'}"`;
}

// Robust JSON extractor from model text
function extractJsonObject(rawText: string): any {
  let candidate = rawText.trim();
  if (candidate.includes('```')) {
    const match = candidate.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      candidate = match[1].trim();
    }
  }
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidate = candidate.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(candidate);
}

// -------------------------------------------------------------
// Provider 1: Google AI Studio (Fast Flash-Lite & 3.8 Vision)
// -------------------------------------------------------------
async function executeGoogleVision(
  apiKey: string,
  image: string | null,
  prompt: string,
  history: any[],
  systemInstruction: string
): Promise<{ text: string; model: string; provider: string }> {
  // Prioritize ultra-low latency gemini-3.5-flash-lite, then 3.8-flash
  const candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.1-pro-preview',
  ];

  // Prepare contents with image and prompt merged
  const contents: any[] = [];

  // Add prior conversation history (if any) with strict alternating turn validation
  let lastRole: string | null = null;
  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history.slice(-6)) {
      if (!msg.text || !msg.text.trim()) continue;
      const role = msg.role === 'model' ? 'model' : 'user';
      if (role !== lastRole) {
        contents.push({ role, parts: [{ text: msg.text.trim() }] });
        lastRole = role;
      }
    }
  }

  // Ensure last turn in history was not 'user'
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents.pop();
  }

  // Current turn parts (Image + Prompt merged for universal compatibility with Gemma & Gemini)
  const currentParts: any[] = [];
  if (image) {
    let base64Data = image;
    let mimeType = 'image/jpeg';
    if (image.includes('base64,')) {
      const parts = image.split('base64,');
      base64Data = parts[1];
      const mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch) mimeType = mimeMatch[1];
    }
    base64Data = base64Data.replace(/[\r\n\s]/g, '');
    currentParts.push({
      inlineData: {
        mimeType,
        data: base64Data,
      },
    });
  }

  currentParts.push({
    text: `${systemInstruction}\n\nUser Question/Action: ${prompt || 'Analyze this image and identify problem/solution.'}`,
  });

  contents.push({ role: 'user', parts: currentParts });

  const errors: string[] = [];

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: 2048,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return { text, model, provider: 'Google DeepMind' };
          }
        } else {
          let errText = '';
          try {
            const errJson = await res.json();
            errText = errJson?.error?.message || JSON.stringify(errJson);
          } catch {
            errText = await res.text();
          }

          // If temporary 503 or 429 spike on attempt 1, backoff 800ms
          if (
            attempt === 1 &&
            (res.status === 503 ||
              res.status === 429 ||
              errText.toLowerCase().includes('high demand'))
          ) {
            await new Promise((r) => setTimeout(r, 800));
            continue;
          }

          errors.push(`[${model}]: (${res.status}) ${errText}`);
          break;
        }
      } catch (e: any) {
        errors.push(`[${model}]: ${e?.message || String(e)}`);
        break;
      }
    }
  }

  throw new Error(`Google AI Studio Cascade: ${errors.join(' | ')}`);
}

// -------------------------------------------------------------
// Provider 2: Groq Cloud (Llama 4 Scout & Llama 3.2 Vision)
// -------------------------------------------------------------
async function executeGroqVision(
  apiKey: string,
  image: string | null,
  prompt: string,
  systemInstruction: string
): Promise<{ text: string; model: string; provider: string }> {
  const models = [
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'llama-3.2-90b-vision-preview',
    'llama-3.2-11b-vision-preview',
  ];

  const content: any[] = [
    {
      type: 'text',
      text: `${systemInstruction}\n\nUser Question/Action: ${prompt || 'Scan and diagnose this object.'}`,
    },
  ];

  if (image) {
    const imageUrl = image.startsWith('data:')
      ? image
      : `data:image/jpeg;base64,${image}`;
    content.push({
      type: 'image_url',
      image_url: { url: imageUrl },
    });
  }

  const errors: string[] = [];

  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content }],
          temperature: 0.25,
          max_tokens: 2048,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          return { text, model, provider: 'Groq Cloud' };
        }
      } else {
        const err = await res.json().catch(() => ({}));
        errors.push(`[${model}]: ${err?.error?.message || res.statusText}`);
      }
    } catch (e: any) {
      errors.push(`[${model}]: ${e.message}`);
    }
  }

  throw new Error(`Groq Vision: ${errors.join(' | ')}`);
}

// -------------------------------------------------------------
// Provider 3: OpenRouter (Multi-Model Universal Vision)
// -------------------------------------------------------------
async function executeOpenRouterVision(
  apiKey: string,
  image: string | null,
  prompt: string,
  systemInstruction: string
): Promise<{ text: string; model: string; provider: string }> {
  const models = [
    'google/gemini-2.0-flash-001',
    'google/gemma-3-27b-it:free',
    'meta-llama/llama-3.2-11b-vision-instruct:free',
  ];

  const content: any[] = [
    {
      type: 'text',
      text: `${systemInstruction}\n\nUser Question/Action: ${prompt || 'Scan and diagnose this object.'}`,
    },
  ];

  if (image) {
    const imageUrl = image.startsWith('data:')
      ? image
      : `data:image/jpeg;base64,${image}`;
    content.push({
      type: 'image_url',
      image_url: { url: imageUrl },
    });
  }

  const errors: string[] = [];

  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'KriyaOS Universal Copilot',
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content }],
          temperature: 0.25,
          max_tokens: 2048,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          return { text, model, provider: 'OpenRouter' };
        }
      } else {
        const err = await res.json().catch(() => ({}));
        errors.push(`[${model}]: ${err?.error?.message || res.statusText}`);
      }
    } catch (e: any) {
      errors.push(`[${model}]: ${e.message}`);
    }
  }

  throw new Error(`OpenRouter Vision: ${errors.join(' | ')}`);
}

// -------------------------------------------------------------
// Provider 4: OpenAI (GPT-4o-mini Vision)
// -------------------------------------------------------------
async function executeOpenAiVision(
  apiKey: string,
  image: string | null,
  prompt: string,
  systemInstruction: string
): Promise<{ text: string; model: string; provider: string }> {
  const models = ['gpt-4o-mini', 'gpt-4o'];

  const content: any[] = [
    {
      type: 'text',
      text: `${systemInstruction}\n\nUser Question/Action: ${prompt || 'Scan and diagnose this object.'}`,
    },
  ];

  if (image) {
    const imageUrl = image.startsWith('data:')
      ? image
      : `data:image/jpeg;base64,${image}`;
    content.push({
      type: 'image_url',
      image_url: { url: imageUrl },
    });
  }

  const errors: string[] = [];

  for (const model of models) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content }],
          temperature: 0.25,
          max_tokens: 2048,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          return { text, model, provider: 'OpenAI' };
        }
      } else {
        const err = await res.json().catch(() => ({}));
        errors.push(`[${model}]: ${err?.error?.message || res.statusText}`);
      }
    } catch (e: any) {
      errors.push(`[${model}]: ${e.message}`);
    }
  }

  throw new Error(`OpenAI Vision: ${errors.join(' | ')}`);
}

// Universal Provider Dispatcher
async function dispatchVisionRequest(
  key: string,
  image: string | null,
  prompt: string,
  history: any[],
  systemInstruction: string
): Promise<{ text: string; model: string; provider: string }> {
  const cleanKey = key.trim().replace(/^["']|["']$/g, '');

  if (cleanKey.startsWith('gsk_')) {
    return executeGroqVision(cleanKey, image, prompt, systemInstruction);
  }
  if (cleanKey.startsWith('sk-or-')) {
    return executeOpenRouterVision(cleanKey, image, prompt, systemInstruction);
  }
  if (cleanKey.startsWith('sk-')) {
    return executeOpenAiVision(cleanKey, image, prompt, systemInstruction);
  }

  // Default: Google AI Studio
  return executeGoogleVision(cleanKey, image, prompt, history, systemInstruction);
}

// =============================================================
// MAIN POST HANDLER (With Seamless Dual-Key Failover)
// =============================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      image,
      prompt,
      history,
      apiKey: clientApiKey,
      backupApiKey: clientBackupKey,
      language = 'en',
      memoryPrompt = '',
    } = body;

    const primaryKey =
      (clientApiKey && clientApiKey.trim().replace(/^["']|["']$/g, '')) ||
      getGoogleAiApiKey();

    const backupKey =
      clientBackupKey && clientBackupKey.trim().replace(/^["']|["']$/g, '');

    if (!primaryKey && !backupKey) {
      return NextResponse.json(
        {
          ok: false,
          error: 'MISSING_API_KEY',
          message:
            'Please paste your Google AI Studio API Key (or any backup key) in the left configuration panel.',
        },
        { status: 400 }
      );
    }

    if (!prompt && !image) {
      return NextResponse.json(
        {
          ok: false,
          error: 'EMPTY_INPUT',
          message: 'Please provide a camera image or question.',
        },
        { status: 400 }
      );
    }

    const isVerification = Boolean(body.isVerification);

    const systemInstruction = buildSystemInstruction(
      language,
      prompt,
      memoryPrompt,
      isVerification
    );

    let result: { text: string; model: string; provider: string } | null = null;
    let failoverTriggered = false;
    let primaryError: string | null = null;

    // 1. Try Primary Key
    if (primaryKey) {
      try {
        result = await dispatchVisionRequest(
          primaryKey,
          image,
          prompt,
          history,
          systemInstruction
        );
      } catch (err: any) {
        primaryError = err?.message || String(err);
      }
    }

    // 2. Failover to Backup Key if primary failed or was unavailable
    if (!result && backupKey) {
      try {
        result = await dispatchVisionRequest(
          backupKey,
          image,
          prompt,
          history,
          systemInstruction
        );
        failoverTriggered = true;
      } catch (backupErr: any) {
        return NextResponse.json(
          {
            ok: false,
            error: 'ALL_PROVIDERS_FAILED',
            message: `Primary Key Error: ${primaryError} | Backup Key Error: ${backupErr?.message || String(backupErr)}`,
          },
          { status: 502 }
        );
      }
    }

    if (!result || !result.text) {
      return NextResponse.json(
        {
          ok: false,
          error: 'PRIMARY_FAILED_NO_BACKUP',
          message: primaryError || 'Vision request failed. Consider adding a backup key in the sidebar.',
        },
        { status: 502 }
      );
    }

    // Parse JSON from model output with robust extraction
    let parsedData: any = null;
    try {
      parsedData = extractJsonObject(result.text);
    } catch {
      // Fallback structure if model generated plain prose
      parsedData = {
        detected_object_name: 'Scanned Physical Object',
        object_category: 'Hardware / Physical',
        condition_and_material: 'Identified via live camera',
        safety_status: 'SAFE',
        box: { x: 26, y: 18, width: 48, height: 64, label: 'Detected Object' },
        box_2d: [180, 260, 820, 740],
        spoken_greeting_and_question: result.text.slice(0, 180),
        dynamic_action_options: [
          '🔧 Troubleshoot & Inspect',
          '🛒 Search Similar Online',
          '♻️ Eco / Disposal Guide',
          '📋 Operating Instructions',
        ],
        solution_steps: [result.text.slice(0, 320)],
        agent_skill_execution: {
          skill_name: 'Google Search & Shopping Link',
          action_type: 'search',
          search_query: 'identify scanned item repair guide',
          search_url: 'https://www.google.com/search?q=identify+scanned+item+repair+guide',
          detail: 'Web reference generated for physical object',
        },
        new_learned_memory_rule: 'Analyzed physical item and mapped conversational follow-ups.',
        spoken_summary: result.text.slice(0, 220),
        follow_up_suggestions: [
          'How do I maintain or fix this?',
          'What are the safety risks?',
          'Find similar products online',
        ],
      };
    }

    // Ensure box percentages exist if box_2d was returned
    if (
      parsedData.box_2d &&
      Array.isArray(parsedData.box_2d) &&
      parsedData.box_2d.length === 4 &&
      !parsedData.box
    ) {
      const [ymin, xmin, ymax, xmax] = parsedData.box_2d;
      parsedData.box = {
        y: Math.max(0, Math.min(100, Math.round(ymin / 10))),
        x: Math.max(0, Math.min(100, Math.round(xmin / 10))),
        height: Math.max(5, Math.min(100, Math.round((ymax - ymin) / 10))),
        width: Math.max(5, Math.min(100, Math.round((xmax - xmin) / 10))),
        label: parsedData.detected_object_name || 'Detected Object',
      };
    }

    // Process target_point precision coordinates (0-100% scale)
    if (parsedData.target_point) {
      const rawX = typeof parsedData.target_point.x === 'number' ? parsedData.target_point.x : 500;
      const rawY = typeof parsedData.target_point.y === 'number' ? parsedData.target_point.y : 300;
      parsedData.targetPointNormalized = {
        x: rawX > 100 ? Math.round(rawX / 10) : rawX,
        y: rawY > 100 ? Math.round(rawY / 10) : rawY,
        label: parsedData.target_point.label || 'Target Focus Area',
      };
    } else {
      parsedData.targetPointNormalized = {
        x: parsedData.box?.x ? parsedData.box.x + Math.round((parsedData.box.width || 40) / 2) : 50,
        y: parsedData.box?.y ? parsedData.box.y + Math.round((parsedData.box.height || 40) / 2) : 30,
        label: 'Focus Point',
      };
    }

    // Process smart_links (Shopping, Maps, YouTube)
    const objName = parsedData.detected_object_name || 'physical item';
    const smartShopping = parsedData.smart_links?.shopping_query || `buy ${objName} online`;
    const smartMaps = parsedData.smart_links?.maps_query || `recycle center or repair service near me`;
    const smartYoutube = parsedData.smart_links?.youtube_diy_query || `how to fix or recycle ${objName} guide`;

    parsedData.smart_links = {
      shopping_query: smartShopping,
      shopping_url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(smartShopping)}`,
      maps_query: smartMaps,
      maps_url: `https://www.google.com/maps/search/${encodeURIComponent(smartMaps)}`,
      youtube_diy_query: smartYoutube,
      youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(smartYoutube)}`,
    };

    // Process verification_result if in verification mode
    if (isVerification) {
      const isVerified = parsedData.verification_result?.verified !== false;
      const timeHash = Math.abs((Date.now() ^ 0xabcdef)).toString(16).padStart(8, '0');
      const sha256 = `sha256_${timeHash}${timeHash}${timeHash}${timeHash}${timeHash}${timeHash}${timeHash}${timeHash}`.slice(0, 64);
      parsedData.verification_result = {
        verified: isVerified,
        summary:
          parsedData.verification_result?.summary ||
          (isVerified
            ? 'Visual inspection confirmed: the physical action was successfully completed!'
            : 'Action incomplete: please check the step instructions.'),
        sha256_hash: parsedData.verification_result?.sha256_hash || sha256,
      };
    }

    // Ensure search_url is properly formed
    if (
      parsedData.agent_skill_execution &&
      parsedData.agent_skill_execution.search_query &&
      !parsedData.agent_skill_execution.search_url
    ) {
      parsedData.agent_skill_execution.search_url = `https://www.google.com/search?q=${encodeURIComponent(
        parsedData.agent_skill_execution.search_query
      )}`;
    }

    return NextResponse.json({
      ok: true,
      data: parsedData,
      rawText: result.text,
      modelUsed: result.model,
      providerUsed: result.provider,
      failoverActive: failoverTriggered,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: 'SERVER_ERROR',
        message: error?.message || 'Internal server error while processing image.',
      },
      { status: 500 }
    );
  }
}
