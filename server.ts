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
          shield: 'Deep Radiation Shield Vault surrounded by thick water-wall armor',
          eva: 'Rover & EVA Surface Airlock looking out at dusty craters',
          comms: 'Deep Space Network Comms & Synth Sound Deck',
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
