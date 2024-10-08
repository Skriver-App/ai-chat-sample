import { Ollama } from "ollama";

const { SKRIVER_API_KEY } = process.env;

export async function POST(request: Request) {
  const req = await request.json();
  const question = req.question;

  if (!question) {
    return new Response(JSON.stringify({ error: "Missing question" }), {
      status: 400,
    });
  }

  if (!SKRIVER_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing Skriver API key" }), {
      status: 500,
    });
  }

  const transcriptsResponse = await fetch(
    "https://api.skriver.app/v1/transcripts",
    {
      method: "GET",
      headers: { "X-Api-Key": SKRIVER_API_KEY },
    },
  );

  if (!transcriptsResponse.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch transcripts" }),
      { status: 500 },
    );
  }
  const transcripts: {
    items: {
      id: string;
      recorded_at?: string;
      metadata?: { [key: string]: string };
      speakers?: {
        id: string;
        name: string;
      }[];
      monologues: {
        text: string;
        speaker_id: string;
        start: number;
        end: number;
      }[];
    }[];
  } = await transcriptsResponse.json();

  const ollama = new Ollama({ host: "http://localhost:11434" });

  const transcriptsInMarkdown = transcripts.items
    .map(
      ({ id, recorded_at, metadata, speakers, monologues }, index) => `
Conversation ${index + 1}:

- id: ${id}
- recorded_at: ${recorded_at}
${Object.entries(metadata || {})
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}
  
${monologues
  .map(({ text, speaker_id }) => {
    const speaker =
      speakers?.find(({ id }) => id === speaker_id)?.name ?? speaker_id;

    return `${speaker}: ${text}`;
  })
  .join("\n\n")}
`,
    )
    .join("\n\n---\n\n");

  const prompt = `
You are a consultant for a company that is looking to improve their customer service.
You maintain anonymity and confidentiality for all clients.
You provide useful insights into the company's customer service practices.

---

${transcriptsInMarkdown}

---

With the conversations provided, answer the following question using markdown formatting:

${question}
`;

  const response = await ollama.generate({
    model: "llama3.1",
    prompt,
    stream: true,
  });

  return new Response(
    new ReadableStream({
      start: async (controller) => {
        for await (const part of response) {
          controller.enqueue(part.response);
        }
        controller.close();
      },
    }),
  );
}
