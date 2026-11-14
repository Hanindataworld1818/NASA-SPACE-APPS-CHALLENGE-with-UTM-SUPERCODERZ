import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  ThinkingLevel,
  Type,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  app.use(express.json({ limit: '12mb' }));

  // 1. Live Real-Time Audio Transcription WebSocket via `gemini-3.5-transcribe-live`
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url?.split('?')[0];
    if (pathname === '/live-transcribe') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (clientWs) => {
    const ai = getGenAIClient();
    if (!ai) {
      clientWs.send(
        JSON.stringify({
          error:
            'GEMINI_API_KEY is not configured. Using local browser speech recognition fallback.',
        })
      );
      return;
    }

    let sessionPromise: ReturnType<typeof ai.live.connect> | null = null;
    try {
      sessionPromise = ai.live.connect({
        model: 'gemini-3.5-transcribe-live',
        config: {
          responseModalities: [Modality.TEXT],
          inputAudioTranscription: {
            languageCodes: [],
          },
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (content?.interimInputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  interimTranscript: content.interimInputTranscription.text,
                })
              );
            }
            if (content?.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  transcript: content.inputTranscription.text,
                })
              );
            }
          },
          onerror: (err: unknown) => {
            clientWs.send(
              JSON.stringify({
                error: err instanceof Error ? err.message : 'Live transcription stream error',
              })
            );
          },
        },
      });
    } catch (err) {
      clientWs.send(
        JSON.stringify({
          error: err instanceof Error ? err.message : 'Failed to initialize live transcription',
        })
      );
    }

    clientWs.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        if (parsed.audio && sessionPromise) {
          sessionPromise
            .then((session) => {
              session.sendRealtimeInput({
                audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
              });
            })
            .catch(() => {});
        }
      } catch {
        // Ignore malformed packets
      }
    });

    clientWs.on('close', () => {
      if (sessionPromise) {
        sessionPromise.then((s) => s.close()).catch(() => {});
      }
    });
  });

  // 2. Pre-recorded Audio Transcription (`gemini-3.5-transcribe`) + Commander Reply
  app.post('/api/audio/transcribe', async (req, res) => {
    const { audioBase64, mimeType, customInstructions } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Missing audioBase64 payload' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key not configured in Settings > Secrets.',
      });
    }

    try {
      const audioPart = {
        inlineData: {
          mimeType: typeof mimeType === 'string' ? mimeType : 'audio/webm',
          data: audioBase64,
        },
      };

      const transcribeRes = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            audioPart,
            {
              text: 'Transcribe this astronaut mission audio log accurately into plain text.',
            },
          ],
        },
      });

      const transcriptText = (transcribeRes.text ?? '').trim() || 'Audio signal received by Comms Deck.';

      const replyRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Junior Astronaut voice transmission: "${transcriptText}". Reply in 1-2 short, encouraging sentences confirming how this affects outpost Oxygen, Power, or Radiation Shielding.`,
        config: {
          systemInstruction:
            typeof customInstructions === 'string' && customInstructions.trim()
              ? customInstructions
              : 'You are Commander Nova at NASA Mission Control speaking to a Junior Astronaut aged 7-12.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      return res.json({
        transcript: transcriptText,
        commanderReply: (replyRes.text ?? 'Copy that, Junior Astronaut! Transmission logged.').trim(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Audio transcription failed';
      return res.status(500).json({ error: msg });
    }
  });

  // 3. AI Music & Space Soundtrack Generation (`lyria-3-clip-preview` + `gemini-4-hydrogen` synth composer fallback)
  app.post('/api/music/generate', async (req, res) => {
    const { prompt, mood, imageBase64, imageMimeType, customInstructions } = req.body || {};
    const userPrompt =
      typeof prompt === 'string' && prompt.trim()
        ? prompt.trim()
        : 'Upbeat retro-futuristic space station crewmate adventure theme';

    const ai = getGenAIClient();
    if (ai) {
      // First attempt Lyria 3 (`lyria-3-clip-preview`) if available on the user's API key
      try {
        const contents =
          imageBase64 && typeof imageBase64 === 'string'
            ? {
                parts: [
                  {
                    text: `Generate a 30-second space outpost soundtrack for kids: ${userPrompt}`,
                  },
                  {
                    inlineData: {
                      data: imageBase64,
                      mimeType: typeof imageMimeType === 'string' ? imageMimeType : 'image/jpeg',
                    },
                  },
                ],
              }
            : `Generate a 30-second space outpost soundtrack for kids: ${userPrompt}`;

        const lyriaStream = await ai.models.generateContentStream({
          model: 'lyria-3-clip-preview',
          contents,
        });

        const audioChunks: Buffer[] = [];
        let lyrics = '';
        let outMime = 'audio/mpeg';

        for await (const chunk of lyriaStream) {
          const parts = chunk.candidates?.[0]?.content?.parts;
          if (!parts) continue;
          for (const part of parts) {
            if (part.inlineData?.data) {
              if (audioChunks.length === 0 && part.inlineData.mimeType) {
                outMime = part.inlineData.mimeType;
              }
              audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
            }
            if (part.text) {
              lyrics += part.text;
            }
          }
        }

        if (audioChunks.length > 0) {
          const audioBase64Out = Buffer.concat(audioChunks).toString('base64');
          return res.json({
            source: 'lyria-3-clip-preview',
            title: userPrompt.slice(0, 48),
            bpm: 118,
            mood: mood || 'calm_orbit',
            lyrics:
              lyrics.trim() ||
              'Crewmates working side by side, keeping shields and power high!',
            audioDataUrl: `data:${outMime};base64,${audioBase64Out}`,
            melodyNotes: [60, 64, 67, 72, 69, 67, 64, 62],
            bassNotes: [36, 36, 41, 43],
          });
        }
      } catch {
        // If user declined paid API key or Lyria is unavailable on free key, compose custom synth track via gemini-4-hydrogen
      }

      try {
        const parts: Array<Record<string, unknown>> = [
          {
            text: `Compose a fun, kid-friendly space outpost soundtrack & jingle inspired by: "${userPrompt}" (Mood: ${mood || 'calm_orbit'}).`,
          },
        ];
        if (imageBase64 && typeof imageBase64 === 'string') {
          parts.push({
            inlineData: {
              data: imageBase64,
              mimeType: typeof imageMimeType === 'string' ? imageMimeType : 'image/jpeg',
            },
          });
        }

        const synthRes = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: { parts },
          config: {
            systemInstruction:
              typeof customInstructions === 'string' && customInstructions.trim()
                ? customInstructions
                : 'You are a space outpost music composer for kids ages 7-12.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                bpm: { type: Type.INTEGER },
                lyrics: { type: Type.STRING },
                melodyNotes: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                },
                bassNotes: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                },
              },
              required: ['title', 'bpm', 'lyrics', 'melodyNotes', 'bassNotes'],
            },
          },
        });

        const parsed = JSON.parse((synthRes.text ?? '{}').trim());
        return res.json({
          source: 'gemini-space-synth',
          title: String(parsed.title || 'Crewmate Orbit Groove').slice(0, 60),
          bpm: Math.max(72, Math.min(160, Number(parsed.bpm) || 116)),
          mood: mood || 'calm_orbit',
          lyrics: String(
            parsed.lyrics ||
              'Check the solar panels, tune the water shield, green plants growing in our cosmic field!'
          ).slice(0, 450),
          audioDataUrl: null,
          melodyNotes:
            Array.isArray(parsed.melodyNotes) && parsed.melodyNotes.length >= 4
              ? parsed.melodyNotes.slice(0, 16)
              : [60, 64, 67, 71, 72, 67, 64, 62],
          bassNotes:
            Array.isArray(parsed.bassNotes) && parsed.bassNotes.length >= 2
              ? parsed.bassNotes.slice(0, 8)
              : [36, 43, 41, 38],
        });
      } catch {
        // Fallback to deterministic procedural track below
      }
    }

    return res.json({
      source: 'procedural-synth',
      title: `Outpost Mix: ${userPrompt.slice(0, 32)}`,
      bpm: mood === 'solar_storm_alert' ? 136 : 112,
      mood: mood || 'calm_orbit',
      lyrics:
        'Check the breakers, watch the Sun! Every crewmate gets the mission done! Power to the shields when solar protons fly, keeping oxygen flowing beneath the starry sky!',
      audioDataUrl: null,
      melodyNotes:
        mood === 'solar_storm_alert'
          ? [64, 67, 71, 72, 71, 67, 64, 60]
          : [60, 64, 67, 72, 74, 72, 67, 64],
      bassNotes: [36, 38, 41, 43],
    });
  });

  // 3b. Adaptive Room & Crisis Background Music (`gemini-4-hydrogen` + curated musical themes)
  app.post('/api/music/adaptive', async (req, res) => {
    const { roomId, severity, siteId, sol, donkiClass, customInstructions } = req.body || {};
    const safeRoom =
      typeof roomId === 'string' && roomId.trim() ? roomId.trim() : 'corridor';
    const safeSeverity =
      severity === 'critical' || severity === 'caution' ? severity : 'calm';

    const roomFallbacks: Record<
      string,
      {
        title: string;
        bpm: number;
        synthWave: 'sine' | 'triangle' | 'sawtooth';
        melodyNotes: number[];
        bassNotes: number[];
        padNotes: number[];
      }
    > = {
      power: {
        title: 'Kilopower Reactor Pulse',
        bpm: 112,
        synthWave: 'triangle',
        melodyNotes: [60, 67, 64, 67, 72, 67, 65, 64],
        bassNotes: [36, 36, 43, 41],
        padNotes: [48, 55, 60],
      },
      lifesupport: {
        title: 'Oxygen Bubble Drift',
        bpm: 98,
        synthWave: 'sine',
        melodyNotes: [64, 69, 71, 76, 74, 71, 69, 64],
        bassNotes: [40, 45, 43, 40],
        padNotes: [52, 57, 64],
      },
      hydroponics: {
        title: 'Bio-Dome Sprout Serenity',
        bpm: 88,
        synthWave: 'sine',
        melodyNotes: [62, 66, 69, 74, 73, 69, 66, 62],
        bassNotes: [38, 45, 42, 38],
        padNotes: [50, 57, 62],
      },
      foodlab: {
        title: 'Galley Feast & Lounge Swing',
        bpm: 108,
        synthWave: 'triangle',
        melodyNotes: [60, 64, 67, 69, 72, 69, 67, 64],
        bassNotes: [36, 40, 43, 45],
        padNotes: [48, 52, 55],
      },
      shield: {
        title: 'Water-Wall Bastion Hum',
        bpm: 106,
        synthWave: 'triangle',
        melodyNotes: [57, 60, 64, 69, 67, 64, 60, 59],
        bassNotes: [33, 33, 38, 40],
        padNotes: [45, 52, 57],
      },
      eva: {
        title: 'Surface Rover Expedition',
        bpm: 116,
        synthWave: 'triangle',
        melodyNotes: [60, 62, 67, 72, 74, 72, 67, 64],
        bassNotes: [36, 38, 43, 41],
        padNotes: [48, 55, 62],
      },
      comms: {
        title: 'Deep Space Network Groove',
        bpm: 120,
        synthWave: 'triangle',
        melodyNotes: [64, 67, 71, 74, 76, 74, 71, 67],
        bassNotes: [40, 43, 45, 47],
        padNotes: [52, 59, 64],
      },
      academy: {
        title: 'Academy STEM Quiz Fanfare',
        bpm: 110,
        synthWave: 'triangle',
        melodyNotes: [64, 67, 72, 76, 74, 72, 67, 64],
        bassNotes: [36, 40, 43, 36],
        padNotes: [48, 55, 60],
      },
      corridor: {
        title: 'Starlight Spine Promenade',
        bpm: 102,
        synthWave: 'sine',
        melodyNotes: [60, 64, 67, 71, 69, 67, 64, 60],
        bassNotes: [36, 41, 43, 36],
        padNotes: [48, 55, 59],
      },
    };

    const baseTrack = roomFallbacks[safeRoom] || roomFallbacks.corridor;
    const severityAdjustedFallback =
      safeSeverity === 'critical'
        ? {
            source: 'adaptive-crisis-synth',
            title: `CRISIS ALERT: ${baseTrack.title}`,
            bpm: Math.min(148, baseTrack.bpm + 28),
            synthWave: 'sawtooth' as const,
            melodyNotes: [64, 65, 69, 71, 72, 71, 65, 64],
            bassNotes: [36, 36, 37, 40],
            padNotes: [48, 53, 59],
          }
        : safeSeverity === 'caution'
        ? {
            source: 'adaptive-caution-synth',
            title: `Caution Mix: ${baseTrack.title}`,
            bpm: Math.min(132, baseTrack.bpm + 12),
            synthWave: 'triangle' as const,
            melodyNotes: baseTrack.melodyNotes.map((n, idx) => (idx % 3 === 2 ? n + 1 : n)),
            bassNotes: baseTrack.bassNotes,
            padNotes: baseTrack.padNotes,
          }
        : {
            source: 'adaptive-ambient-synth',
            ...baseTrack,
          };

    const ai = getGenAIClient();
    if (ai) {
      try {
        const roomDescriptions: Record<string, string> = {
          power: 'Kilopower Nuclear Fission & Solar Grid bay with humming turbines',
          lifesupport: 'O2 Water Electrolyzer Bay with gentle bubbling oxygen tanks',
          hydroponics: 'Lush Hydroponic Bio-Dome with glowing pink/blue plant LEDs',
          foodlab: 'Cheerful Space Food Lab, Astro-Kitchen & Crew Dining Lounge',
          shield: 'Deep Radiation Shield Vault surrounded by thick water-wall armor',
          eva: 'Rover & EVA Surface Airlock looking out at dusty craters',
          comms: 'Deep Space Network Comms & Synth Sound Deck',
          academy: 'Junior Astronaut Academy Station learning & quiz center',
          corridor: 'Central pressurized space station spine corridor',
        };
        const aiRes = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Compose an adaptive looping MIDI synth pattern for a kid-friendly space outpost room: "${
            roomDescriptions[safeRoom] || safeRoom
          }" on ${siteId === 'moon' ? 'the Moon' : 'Mars'} (Sol ${sol || 1}, NASA Weather: ${
            donkiClass || 'Quiet'
          }). Current Mission Crisis Severity: ${safeSeverity.toUpperCase()} (${
            safeSeverity === 'critical'
              ? 'urgent dramatic rescue tempo 128-148 BPM, minor/tense notes'
              : safeSeverity === 'caution'
              ? 'alert energetic tempo 110-128 BPM'
              : 'calm wondrous exploratory tempo 84-112 BPM'
          }). Keep MIDI notes between 48 and 79 for melodyNotes, 33 and 48 for bassNotes, and 48 to 67 for padNotes.`,
          config: {
            systemInstruction:
              typeof customInstructions === 'string' && customInstructions.trim()
                ? customInstructions
                : 'You are an adaptive video game soundtrack composer for a kid-friendly NASA outpost game.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                bpm: { type: Type.INTEGER },
                synthWave: { type: Type.STRING },
                melodyNotes: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                bassNotes: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                padNotes: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              },
              required: ['title', 'bpm', 'synthWave', 'melodyNotes', 'bassNotes', 'padNotes'],
            },
          },
        });

        const parsed = JSON.parse((aiRes.text ?? '{}').trim());
        const clampNotes = (arr: unknown, min: number, max: number, fallback: number[]) =>
          Array.isArray(arr) && arr.length >= 3
            ? arr
                .slice(0, 12)
                .map((v) => Math.max(min, Math.min(max, Math.round(Number(v) || min))))
            : fallback;

        const wave =
          parsed.synthWave === 'sawtooth' || parsed.synthWave === 'sine'
            ? parsed.synthWave
            : 'triangle';

        return res.json({
          source: `gemini-adaptive-${safeSeverity}`,
          title: String(parsed.title || severityAdjustedFallback.title).slice(0, 52),
          bpm: Math.max(76, Math.min(152, Number(parsed.bpm) || severityAdjustedFallback.bpm)),
          synthWave: wave,
          melodyNotes: clampNotes(
            parsed.melodyNotes,
            48,
            82,
            severityAdjustedFallback.melodyNotes
          ),
          bassNotes: clampNotes(parsed.bassNotes, 30, 50, severityAdjustedFallback.bassNotes),
          padNotes: clampNotes(parsed.padNotes, 45, 68, severityAdjustedFallback.padNotes),
        });
      } catch {
        // Fallback to curated deterministic room/severity motif below
      }
    }

    return res.json(severityAdjustedFallback);
  });

  // 4. Dynamic Mission Event Generator (`gemini-4-hydrogen` + Custom Instructions + NASA DONKI context)
  app.post('/api/events/generate', async (req, res) => {
    const { siteId, sol, donkiTitle, customInstructions } = req.body || {};
    const ai = getGenAIClient();

    if (!ai) {
      return res.status(200).json({ fallback: true });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Create 1 exciting Among-Us-style Junior Astronaut outpost emergency decision for kids ages 7-12 on ${
          siteId === 'moon' ? 'the Moon (Artemis Base)' : 'Mars (Jezero Outpost)'
        } during Sol ${sol || 1} (Current NASA Space Weather: ${
          donkiTitle || 'Active Solar Wind'
        }). Both choices MUST involve a real engineering trade-off (no free safe choice) balancing Oxygen (%), Food (%), Radiation (mSv), and Science.`,
        config: {
          systemInstruction:
            typeof customInstructions === 'string' && customInstructions.trim()
              ? customInstructions
              : 'You are a playful NASA space mission designer for kids ages 7-12. Keep sentences short, vivid, and crystal clear.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              nasaSourceTag: { type: Type.STRING },
              alertLevel: { type: Type.STRING },
              storyPrompt: { type: Type.STRING },
              kidLesson: { type: Type.STRING },
              optionA: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  kidConsequence: { type: Type.STRING },
                  oxygen: { type: Type.INTEGER },
                  food: { type: Type.INTEGER },
                  radiationMsv: { type: Type.NUMBER },
                  science: { type: Type.INTEGER },
                },
                required: ['label', 'kidConsequence', 'oxygen', 'food', 'radiationMsv', 'science'],
              },
              optionB: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  kidConsequence: { type: Type.STRING },
                  oxygen: { type: Type.INTEGER },
                  food: { type: Type.INTEGER },
                  radiationMsv: { type: Type.NUMBER },
                  science: { type: Type.INTEGER },
                },
                required: ['label', 'kidConsequence', 'oxygen', 'food', 'radiationMsv', 'science'],
              },
            },
            required: [
              'title',
              'nasaSourceTag',
              'alertLevel',
              'storyPrompt',
              'kidLesson',
              'optionA',
              'optionB',
            ],
          },
        },
      });

      const raw = JSON.parse((response.text ?? '{}').trim());
      return res.json({
        event: {
          id: `ai-evt-${Date.now()}`,
          title: String(raw.title || 'EMERGENCY MEETING: Solar Flux Anomaly!'),
          nasaSourceTag: String(raw.nasaSourceTag || 'NASA DONKI & ECLSS Telemetry'),
          alertLevel: raw.alertLevel === 'critical' ? 'critical' : 'warning',
          storyPrompt: String(raw.storyPrompt || ''),
          kidLesson: String(raw.kidLesson || ''),
          optionA: {
            label: String(raw.optionA?.label || 'Boost Shielding'),
            kidConsequence: String(raw.optionA?.kidConsequence || 'Saves crew from radiation, uses O2'),
            deltas: {
              oxygen: Math.max(-20, Math.min(20, Number(raw.optionA?.oxygen) || -8)),
              food: Math.max(-20, Math.min(20, Number(raw.optionA?.food) || 0)),
              radiationMsv: Math.max(0, Math.min(25, Number(raw.optionA?.radiationMsv) || 2)),
              science: Math.max(-15, Math.min(30, Number(raw.optionA?.science) || 5)),
            },
          },
          optionB: {
            label: String(raw.optionB?.label || 'Conserve Power & Keep Labs Running'),
            kidConsequence: String(raw.optionB?.kidConsequence || 'Saves O2 & Science, adds radiation'),
            deltas: {
              oxygen: Math.max(-20, Math.min(20, Number(raw.optionB?.oxygen) || 6)),
              food: Math.max(-20, Math.min(20, Number(raw.optionB?.food) || 5)),
              radiationMsv: Math.max(0, Math.min(25, Number(raw.optionB?.radiationMsv) || 14)),
              science: Math.max(-15, Math.min(30, Number(raw.optionB?.science) || 15)),
            },
          },
        },
      });
    } catch {
      return res.status(200).json({ fallback: true });
    }
  });

  // 5. Real NASA Open Data Server-Side Proxies (DONKI, APOD, Mars Rover Photos, OSDR Search, RadLab)
  const nasaApiKey = process.env.NASA_API_KEY || 'QkwbdwDpGwFHMCBmqWCd8F6fFjtDFzBQqCj8GwdC';
  const nasaProxyCache = new Map<string, { expiresAt: number; payload: unknown }>();
  const getCachedNasa = (key: string) => {
    const hit = nasaProxyCache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.payload;
    return null;
  };
  const setCachedNasa = (key: string, payload: unknown, ttlMs: number = 10 * 60 * 1000) => {
    nasaProxyCache.set(key, { expiresAt: Date.now() + ttlMs, payload });
  };

  app.get('/api/nasa/donki', async (_req, res) => {
    const cached = getCachedNasa('donki');
    if (cached) return res.json(cached);

    const end = new Date();
    const start = new Date(end.getTime() - 45 * 24 * 60 * 60 * 1000);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    try {
      const [flrRes, cmeRes] = await Promise.all([
        fetch(
          `https://api.nasa.gov/DONKI/FLR?startDate=${startStr}&endDate=${endStr}&api_key=${encodeURIComponent(
            nasaApiKey
          )}`,
          { signal: AbortSignal.timeout(4500) }
        ),
        fetch(
          `https://api.nasa.gov/DONKI/CME?startDate=${startStr}&endDate=${endStr}&api_key=${encodeURIComponent(
            nasaApiKey
          )}`,
          { signal: AbortSignal.timeout(4500) }
        ).catch(() => null),
      ]);

      if (!flrRes.ok) throw new Error(`DONKI HTTP ${flrRes.status}`);
      const flrJson = await flrRes.json();
      const cmeJson = cmeRes && cmeRes.ok ? await cmeRes.json().catch(() => []) : [];
      if (Array.isArray(flrJson) && flrJson.length > 0) {
        const payload = {
          status: 'live',
          events: flrJson
            .slice(-6)
            .reverse()
            .map((item: Record<string, unknown>) => ({
              flrID: String(item.flrID || 'DONKI-FLR'),
              beginTime: String(item.beginTime || ''),
              peakTime: String(item.peakTime || ''),
              classType: String(item.classType || 'M1.0'),
              sourceLocation: String(item.sourceLocation || 'Active Sunspot'),
              link: String(item.link || 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/'),
            })),
          cmeCount: Array.isArray(cmeJson) ? cmeJson.length : 0,
        };
        setCachedNasa('donki', payload);
        return res.json(payload);
      }
    } catch {
      // Fallback handled below cleanly
    }

    return res.json({ status: 'archive', events: [], cmeCount: 0 });
  });

  app.get('/api/nasa/apod', async (_req, res) => {
    const cached = getCachedNasa('apod');
    if (cached) return res.json(cached);

    try {
      const r = await fetch(
        `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(nasaApiKey)}&thumbs=true`,
        { signal: AbortSignal.timeout(4500) }
      );
      if (r.ok) {
        const d = await r.json();
        if (d && d.title && (d.url || d.thumbnail_url)) {
          const payload = {
            status: 'live',
            title: String(d.title),
            date: String(d.date || ''),
            explanation: String(d.explanation || ''),
            imageUrl: String(d.media_type === 'video' ? d.thumbnail_url || d.url : d.url),
            copyright: d.copyright ? String(d.copyright) : 'NASA / Public Domain',
          };
          setCachedNasa('apod', payload, 30 * 60 * 1000);
          return res.json(payload);
        }
      }
    } catch {
      // Try NASA Images API live spotlight as secondary live source
    }

    try {
      const r2 = await fetch(
        'https://images-api.nasa.gov/search?q=perseverance%20jezero%20crater%20mars&media_type=image&page_size=4',
        { signal: AbortSignal.timeout(4500) }
      );
      if (r2.ok) {
        const j2 = await r2.json();
        const item = j2?.collection?.items?.[0];
        const meta = item?.data?.[0];
        const href = item?.links?.[0]?.href;
        if (meta && href) {
          const payload = {
            status: 'live-images-api',
            title: String(meta.title || 'Jezero Crater Landing Site'),
            date: String((meta.date_created || '').slice(0, 10)),
            explanation: String(meta.description || '').slice(0, 360),
            imageUrl: String(href),
            copyright: String(meta.center || 'NASA JPL'),
          };
          setCachedNasa('apod', payload, 20 * 60 * 1000);
          return res.json(payload);
        }
      }
    } catch {
      // Deterministic curated fallback below
    }

    return res.json({ status: 'archive', title: '', date: '', explanation: '', imageUrl: '' });
  });

  app.get('/api/nasa/mars-photos', async (_req, res) => {
    const cached = getCachedNasa('mars-photos');
    if (cached) return res.json(cached);

    try {
      const r = await fetch(
        'https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&num=6&page=0&order=sol+desc',
        { signal: AbortSignal.timeout(4500) }
      );
      if (r.ok) {
        const d = await r.json();
        const imgs = Array.isArray(d?.images) ? d.images : [];
        if (imgs.length > 0) {
          const photos = imgs.slice(0, 6).map((img: Record<string, unknown>, idx: number) => {
            const files = (img.image_files as Record<string, string> | undefined) || {};
            const camera = (img.camera as Record<string, string> | undefined) || {};
            return {
              id: String(img.imageid || `m2020-${idx}`),
              sol: Number(img.sol || 1000),
              earthDate: String(img.date_taken_utc || '').slice(0, 10) || 'Recent Sol',
              cameraName: String(camera.instrument || 'MASTCAM / SUPERCAM'),
              title: String(img.title || `Perseverance Sol ${img.sol || ''}`),
              caption: String(img.caption || 'Raw surface image captured in Jezero Crater, Mars.'),
              imgSrc: String(files.medium || files.small || files.full_res || ''),
            };
          });
          const payload = { status: 'live', rover: 'Perseverance (Mars 2020)', photos };
          setCachedNasa('mars-photos', payload, 15 * 60 * 1000);
          return res.json(payload);
        }
      }
    } catch {
      // Fallback below
    }

    return res.json({ status: 'archive', rover: 'Perseverance (Mars 2020)', photos: [] });
  });

  app.get('/api/nasa/osdr-search', async (req, res) => {
    const q = String(req.query.q || 'bone').trim().slice(0, 80) || 'bone';
    const cacheKey = `osdr:${q.toLowerCase()}`;
    const cached = getCachedNasa(cacheKey);
    if (cached) return res.json(cached);

    try {
      const url = `https://osdr.nasa.gov/osdr/data/search?term=${encodeURIComponent(
        q
      )}&from=0&size=5&type=cgene`;
      const r = await fetch(url, { signal: AbortSignal.timeout(4500) });
      if (r.ok) {
        const d = await r.json();
        const hits = Array.isArray(d?.hits?.hits) ? d.hits.hits : [];
        const total = Number(d?.hits?.total || hits.length);
        const studies = hits.map((h: Record<string, unknown>) => {
          const src = (h._source as Record<string, unknown>) || {};
          const rawDesc = String(src['Study Description'] || src['Study Protocol Description'] || '');
          return {
            accessionId: String(src.Accession || h._id || 'OSDR'),
            title: String(src['Study Title'] || 'NASA Space Biology Study'),
            organism: String(src.organism || 'Spaceflight Model Organism'),
            mission: String(src['Flight Program'] || src.Mission || 'NASA ISS / Space Biology'),
            keyFinding: rawDesc.slice(0, 260) + (rawDesc.length > 260 ? '...' : ''),
            sourceUrl: String(
              src['Authoritative Source URL'] ||
                `https://osdr.nasa.gov/bio/repo/data/studies/${String(src.Accession || '')}`
            ),
          };
        });
        const payload = { status: 'live', query: q, totalHits: total, studies };
        setCachedNasa(cacheKey, payload, 15 * 60 * 1000);
        return res.json(payload);
      }
    } catch {
      // Archive fallback handled cleanly on client/server
    }

    return res.json({ status: 'archive', query: q, totalHits: 0, studies: [] });
  });

  app.get('/api/nasa/radlab', async (_req, res) => {
    const cached = getCachedNasa('radlab');
    if (cached) return res.json(cached);

    try {
      const url =
        'https://visualization.osdr.nasa.gov/radlab/api?query=(instrument=DosTel1)AND(timestamp>=2024-05-10)AND(timestamp<=2024-05-12)&fields+=absorbed_dose_rate&format=json';
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (r.ok) {
        const d = await r.json();
        const cols: string[] = Array.isArray(d?.columns) ? d.columns : [];
        const rows: unknown[][] = Array.isArray(d?.data) ? d.data : [];
        const tsIdx = cols.indexOf('timestamp');
        const rateIdx = cols.indexOf('absorbed_dose_rate');
        const instIdx = cols.indexOf('instrument_id');
        if (rateIdx >= 0 && rows.length > 0) {
          const sampled = rows
            .filter((_, idx) => idx % Math.max(1, Math.floor(rows.length / 8)) === 0)
            .slice(0, 8)
            .map((row) => ({
              timestamp: String(row[tsIdx] || ''),
              instrument: String(row[instIdx] || 'DosTel1'),
              doseRateUgyPerDay: Number((Number(row[rateIdx] || 0) * 24).toFixed(1)),
              rawRate: Number(row[rateIdx] || 0),
            }));
          const avgRate =
            sampled.reduce((acc, s) => acc + s.doseRateUgyPerDay, 0) / Math.max(1, sampled.length);
          const payload = {
            status: 'live',
            sampleCount: rows.length,
            issDosTelAvgUgyDay: Number(avgRate.toFixed(1)),
            samples: sampled,
          };
          setCachedNasa('radlab', payload, 20 * 60 * 1000);
          return res.json(payload);
        }
      }
    } catch {
      // Curated verified RadLab fallback below
    }

    return res.json({ status: 'archive', sampleCount: 0, issDosTelAvgUgyDay: 245, samples: [] });
  });

  // 5b. NASA Mars Trek & Moon Trek WMTS Tile Proxy + Outpost Image Gallery
  const trekTileByteCache = new Map<string, { expiresAt: number; buf: Buffer; contentType: string }>();
  const ALLOWED_TREK_LAYERS = new Set([
    'Mars_Viking_MDIM21_ClrMosaic_global_232m',
    'Mars_MGS_MOLA_ClrShade_merge_global_463m',
    'Lunar_LRO_LROC-WAC_Mosaic_global_100m_June2013',
    'Lunar_LRO_LOLA_ClrShade_Global_128ppd_v04',
  ]);

  app.get('/api/nasa/trek-tile', async (req, res) => {
    const planet = req.query.planet === 'Moon' ? 'Moon' : 'Mars';
    const layer = String(req.query.layer || 'Mars_Viking_MDIM21_ClrMosaic_global_232m');
    if (!ALLOWED_TREK_LAYERS.has(layer)) {
      return res.status(400).json({ error: 'Invalid Trek layer' });
    }
    const z = Math.max(0, Math.min(5, Math.round(Number(req.query.z) || 2)));
    const row = Math.max(0, Math.min(64, Math.round(Number(req.query.row) || 0)));
    const col = Math.max(0, Math.min(128, Math.round(Number(req.query.col) || 0)));

    const cacheKey = `${planet}:${layer}:${z}:${row}:${col}`;
    const hit = trekTileByteCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      res.setHeader('Content-Type', hit.contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(hit.buf);
    }

    const upstreamUrl =
      planet === 'Moon'
        ? `https://trek.nasa.gov/tiles/Moon/EQ/${layer}/1.0.0/default/default028mm/${z}/${row}/${col}.jpg`
        : `https://trek.nasa.gov/tiles/Mars/EQ/${layer}/1.0.0/default/default028mm/${z}/${row}/${col}.jpg`;

    const sendFallbackTrekSvg = () => {
      const isMoon = planet === 'Moon';
      const bg1 = isMoon ? '#1E293B' : '#7C2D12';
      const bg2 = isMoon ? '#090E1A' : '#431407';
      const accent = isMoon ? '#38BDF8' : '#FB923C';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
        <defs><radialGradient id="g" cx="45%" cy="45%"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></radialGradient></defs>
        <rect width="256" height="256" fill="url(#g)"/>
        <circle cx="96" cy="112" r="46" fill="none" stroke="${accent}" stroke-opacity="0.38" stroke-width="2"/>
        <circle cx="174" cy="168" r="28" fill="none" stroke="${accent}" stroke-opacity="0.3" stroke-width="2"/>
        <text x="128" y="236" text-anchor="middle" fill="#E2E8F0" font-family="monospace" font-size="11">${planet.toUpperCase()} TREK ARCHIVE · Z${z}</text>
      </svg>`;
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=600');
      return res.status(200).send(svg);
    };

    try {
      const upstream = await fetch(upstreamUrl, { signal: AbortSignal.timeout(4500) });
      if (!upstream.ok) {
        return sendFallbackTrekSvg();
      }
      const arr = await upstream.arrayBuffer();
      const buf = Buffer.from(arr);
      const contentType = upstream.headers.get('content-type') || 'image/jpeg';
      if (trekTileByteCache.size > 160) trekTileByteCache.clear();
      trekTileByteCache.set(cacheKey, {
        expiresAt: Date.now() + 60 * 60 * 1000,
        buf,
        contentType,
      });
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(buf);
    } catch {
      return sendFallbackTrekSvg();
    }
  });

  app.get('/api/nasa/mars-trek-gallery', async (req, res) => {
    const siteId = req.query.siteId === 'moon' ? 'moon' : 'mars';
    const cacheKey = `trek-gallery:${siteId}`;
    const cached = getCachedNasa(cacheKey);
    if (cached) return res.json(cached);

    const searchQuery =
      siteId === 'moon'
        ? 'shackleton crater lunar south pole LRO'
        : 'jezero crater perseverance mars orbital delta';

    let nasaImagesSlides: Array<{
      id: string;
      title: string;
      zoneLabel: string;
      coordinates: string;
      elevationLabel: string;
      instrument: string;
      description: string;
      imageUrl: string;
      sourceTag: string;
    }> = [];
    let liveNasaImages = false;

    try {
      const imgRes = await fetch(
        `https://images-api.nasa.gov/search?q=${encodeURIComponent(
          searchQuery
        )}&media_type=image&page_size=6`,
        { signal: AbortSignal.timeout(4500) }
      );
      if (imgRes.ok) {
        const imgJson = await imgRes.json();
        const items = Array.isArray(imgJson?.collection?.items) ? imgJson.collection.items : [];
        nasaImagesSlides = items
          .slice(0, 4)
          .map((item: Record<string, unknown>, idx: number) => {
            const meta = ((item.data as Array<Record<string, unknown>> | undefined) || [])[0] || {};
            const link = ((item.links as Array<Record<string, unknown>> | undefined) || [])[0] || {};
            const href = String(link.href || '');
            return {
              id: `nasa-live-${siteId}-${idx}`,
              title: String(meta.title || 'NASA Landing Zone Reconnaissance').slice(0, 88),
              zoneLabel:
                siteId === 'moon'
                  ? 'Shackleton Crater Rim · Artemis South Pole'
                  : 'Jezero Crater Delta · Outpost Landing Zone',
              coordinates: siteId === 'moon' ? '89.9° S, 0.0° E' : '18.38° N, 77.58° E',
              elevationLabel: siteId === 'moon' ? '-4,200 m Crater Floor / +1,800 m Rim' : '-2,560 m Delta Basin',
              instrument: String(meta.center || 'NASA JPL / GSFC Archive'),
              description: String(
                meta.description ||
                  'Official NASA orbital and surface reconnaissance imagery of your landing zone.'
              )
                .replace(/\s+/g, ' ')
                .slice(0, 220),
              imageUrl: href,
              sourceTag: 'NASA Trek & Images API',
            };
          })
          .filter((s: { imageUrl: string }) => s.imageUrl.startsWith('https://'));
        liveNasaImages = nasaImagesSlides.length > 0;
      }
    } catch {
      // Continue with Trek WMTS high-res orbital tiles + curated assets
    }

    // Probe Trek WMTS Capabilities availability to report live Trek status cleanly
    let liveTrekStatus = false;
    try {
      const probe = await fetch(
        siteId === 'moon'
          ? 'https://trek.nasa.gov/tiles/Moon/EQ/Lunar_LRO_LROC-WAC_Mosaic_global_100m_June2013/1.0.0/WMTSCapabilities.xml'
          : 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml',
        { method: 'HEAD', signal: AbortSignal.timeout(3500) }
      );
      liveTrekStatus = probe.ok;
    } catch {
      liveTrekStatus = false;
    }

    const trekLayerSlides =
      siteId === 'moon'
        ? [
            {
              id: 'trek-moon-wac-rim',
              title: 'Lunar Reconnaissance Orbiter · South Pole Mosaic',
              zoneLabel: 'Shackleton Crater Rim (Artemis Landing Zone)',
              coordinates: '89.5° S, 0.0° E',
              elevationLabel: '+1,800 m Sunlit Rim',
              instrument: 'NASA Moon Trek · LRO WAC 100m/px',
              description:
                'High-resolution orbital tile showing bright sunlit peaks around Shackleton Crater where solar arrays capture nearly continuous sunlight.',
              imageUrl:
                '/api/nasa/trek-tile?planet=Moon&layer=Lunar_LRO_LROC-WAC_Mosaic_global_100m_June2013&z=2&row=3&col=4',
              sourceTag: 'NASA Moon Trek WMTS',
            },
            {
              id: 'trek-moon-lola-elev',
              title: 'LOLA Laser Altimeter Elevation & Ice Shadows',
              zoneLabel: 'Permanent Shadowed Ice Crater Floor',
              coordinates: '88.2° S, 18.0° E',
              elevationLabel: '-4,200 m Ice Deposit Basin',
              instrument: 'NASA Moon Trek · LRO LOLA Shaded Relief',
              description:
                'Laser elevation scan pinpointing frozen water-ice traps inside shadowed craters used for EVA drilling and Electrolyzer O2.',
              imageUrl:
                '/api/nasa/trek-tile?planet=Moon&layer=Lunar_LRO_LOLA_ClrShade_Global_128ppd_v04&z=2&row=3&col=4',
              sourceTag: 'NASA Moon Trek WMTS',
            },
          ]
        : [
            {
              id: 'trek-mars-jezero-viking',
              title: 'Jezero Crater Orbital Mosaic · Outpost Alpha Sector',
              zoneLabel: 'Jezero Crater Delta (Your Chosen Landing Zone)',
              coordinates: '18.38° N, 77.58° E',
              elevationLabel: '-2,560 m Ancient Lakebed',
              instrument: 'NASA Mars Trek · Viking MDIM 2.1 (232m/px)',
              description:
                'Authentic Mars Trek true-color orbital imagery of Isidis Planitia & Jezero Crater rim where Perseverance & Ingenuity landed.',
              imageUrl:
                '/api/nasa/trek-tile?planet=Mars&layer=Mars_Viking_MDIM21_ClrMosaic_global_232m&z=3&row=3&col=11',
              sourceTag: 'NASA Mars Trek WMTS',
            },
            {
              id: 'trek-mars-jezero-mola',
              title: 'Jezero & Syrtis Major MOLA Laser Elevation',
              zoneLabel: 'Jezero Basin Watershed & Terrain Slope',
              coordinates: '18.38° N, 77.58° E',
              elevationLabel: '-2,560 m Delta Terrace',
              instrument: 'NASA Mars Trek · MGS MOLA ClrShade (463m/px)',
              description:
                'Elevation contour scan showing the river inflow channel feeding Jezero Lake—ideal flat terrain for solar farms & Bio-Dome modules.',
              imageUrl:
                '/api/nasa/trek-tile?planet=Mars&layer=Mars_MGS_MOLA_ClrShade_merge_global_463m&z=3&row=3&col=11',
              sourceTag: 'NASA Mars Trek WMTS',
            },
            {
              id: 'trek-mars-gale-crater',
              title: 'Gale Crater & Mount Sharp Reconnaissance Sector',
              zoneLabel: 'Curiosity RAD Dosimetry Reference Site',
              coordinates: '5.4° S, 137.8° E',
              elevationLabel: '-4,500 m Crater Floor',
              instrument: 'NASA Mars Trek · Viking Color Mosaic',
              description:
                'Orbital mosaic over Gale Crater where NASA Curiosity RAD instruments measured the real 0.64 mSv/sol baseline dose modeled in AstroBase.',
              imageUrl:
                '/api/nasa/trek-tile?planet=Mars&layer=Mars_Viking_MDIM21_ClrMosaic_global_232m&z=3&row=4&col=14',
              sourceTag: 'NASA Mars Trek WMTS',
            },
          ];

    const payload = {
      status: liveTrekStatus || liveNasaImages ? 'live' : 'archive',
      siteId,
      slides: [...trekLayerSlides, ...nasaImagesSlides].slice(0, 6),
    };
    setCachedNasa(cacheKey, payload, 20 * 60 * 1000);
    return res.json(payload);
  });

  // Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AstroBase Junior Astronaut Trainer running on http://localhost:${PORT}`);
  });
}

startServer();
