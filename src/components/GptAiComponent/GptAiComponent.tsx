import React, { useState } from 'react';

const GptAiComponent = () => {
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('');

  const voices = [
    { id: 'v1', name: 'US English', accent: 'American' },
    { id: 'v2', name: 'British English', accent: 'British' },
    { id: 'v3', name: 'Australian English', accent: 'Australian' },
    { id: 'v4', name: 'Indian English', accent: 'Indian' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle API call here
    console.log({ apiKey, prompt, selectedVoice });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">GPT AI Configuration</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* API Key Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <div className="relative">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your OpenAI API key"
              required
            />
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
            placeholder="Enter your prompt here..."
            required
          />
        </div>

        {/* Voice Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voice Selection
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {voices.map((voice) => (
              <div
                key={voice.id}
                className={`cursor-pointer p-4 rounded-lg border transition-all ${
                  selectedVoice === voice.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-200'
                }`}
                onClick={() => setSelectedVoice(voice.id)}
              >
                <div className="text-sm font-medium text-gray-900">{voice.name}</div>
                <div className="text-xs text-gray-500">{voice.accent} Accent</div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Generate Response
          </button>
        </div>
      </form>
    </div>
  );
};

export default GptAiComponent;