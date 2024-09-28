'use client'

import React, { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Home() {
  const [answers, setAnswers] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnswers("");

    const formData = new FormData(event.currentTarget);
    const question = formData.get("question") as string;

    const resp = await fetch("http://localhost:3000/ask-question", {
      method: "POST",
      body: JSON.stringify({question}),
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

    await streamResponse(resp);
  }

  async function streamResponse(resp: Response) {
    const reader = resp.body?.getReader();
    const decoder = new TextDecoder();

    reader?.read().then(async function processText({done, value}): Promise<void> {
      if (done) return;
      const text = decoder.decode(value);
      setAnswers((prevRecipes) => prevRecipes + text);
      return reader?.read().then(processText);
    })
  }

  return (
    <div className="flex justify-center p-12">
      <main className="max-w-4xl w-full">

        <form onSubmit={handleSubmit} className="mb-5">
        <textarea
          name="question"
          placeholder="Ask your question here"
          className="border border-gray-400 rounded-md p-5 text-black w-full min-h-32 mb-5 outline-none focus:ring-4 focus:ring-blue-700 focus:border-blue-700 text-xl"/>
          <button type="submit" className="bg-blue-700 hover:bg-blue-800 focus:ring-blue-900 text-xl rounded-md py-5 w-full">Submit
          </button>
        </form>
        {answers &&
          <article className="bg-gray-700 p-5 rounded-md prose prose-invert w-full max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{answers}</Markdown>
          </article>
        }
      </main>
    </div>
  );
}
