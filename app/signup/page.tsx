'use client'

import { useState } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function SignupPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey, I'm Kairos, your startup co-pilot. What’s your name?",
    },
  ])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!input.trim()) return

    const userText = input.trim()
    setInput('')

    // Add user message to UI
    setMessages((prev) => [...prev, { role: 'user', content: userText }])
    setLoading(true)

    try {
      const res = await fetch('/api/signup/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      })

      const data = await res.json()

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply as string },
      ])
    } catch (err) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Oops, something went wrong calling the signup API.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md border rounded-xl p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`px-3 py-2 rounded-lg text-sm ${
                m.role === 'assistant'
                  ? 'bg-gray-100 text-gray-900 self-start'
                  : 'bg-orange-600 text-white self-end'
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="px-3 py-2 rounded-lg text-sm bg-gray-100 text-gray-900 self-start">
              Kairos is thinking...
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
          />
          <button
            onClick={handleSend}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            disabled={loading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
