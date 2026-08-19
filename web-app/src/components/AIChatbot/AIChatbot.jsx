import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './AIChatbot.css';

const suggestions = [
  '🍔 Recommend something for me',
  '🥗 Show vegetarian options',
  '💰 What can I get under ₹200?',
  '🔥 What is popular today?',
];

export function AIChatbot({ restaurantId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hi! 👋 I’m Foodyply AI. What would you like to eat today?',
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, isLoading]);

  const sendMessage = async (text = message) => {
    const trimmedMessage = text.trim();

    if (!trimmedMessage || isLoading) return;

    console.log(
      'Foodyply AI restaurantId:',
      restaurantId,
    );

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: trimmedMessage,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(
        'http://localhost:7001/api/ai/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: trimmedMessage,
            restaurantId: restaurantId
              ? Number(restaurantId)
              : null,
          }),
        },
      );

      const data = await response.json();

      console.log(
        'Foodyply AI API response:',
        data,
      );

      if (!response.ok) {
        throw new Error(
          data.message || 'AI request failed',
        );
      }

      const aiResponse =
        data.data?.message ||
        data.message ||
        'Sorry, I could not generate a response.';

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: aiResponse,
      };

      setMessages((prev) => [
        ...prev,
        botMessage,
      ]);
    } catch (error) {
      console.error(
        'Foodyply AI Error:',
        error,
      );

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'bot',
          text:
            'Sorry, I could not connect to Foodyply AI right now. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <>
      {!isOpen && (
        <button
          className="ai-chatbot-button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Foodyply AI"
        >
          <span className="ai-chatbot-sparkle">
            ✦
          </span>

          <span className="ai-brand-name">
            <span className="ai-brand-food">
              FOODY
            </span>

            <span className="ai-brand-ply">
              PLY
            </span>

            <span className="ai-brand-ai">
              {' '}AI
            </span>
          </span>
        </button>
      )}

      {isOpen && (
        <div className="ai-chatbot">
          <div className="ai-chatbot-header">
            <div className="ai-chatbot-title">
              <div className="ai-chatbot-avatar">
                ✦
              </div>

              <div>
                <h3>
                  <span className="ai-brand-food">
                    FOODY
                  </span>

                  <span className="ai-brand-ply">
                    PLY
                  </span>

                  <span className="ai-header-ai">
                    {' '}AI
                  </span>
                </h3>

                <span>
                  <i />
                  {isLoading
                    ? 'Thinking...'
                    : 'Online'}
                </span>
              </div>
            </div>

            <button
              className="ai-chatbot-close"
              onClick={() =>
                setIsOpen(false)
              }
              aria-label="Close chatbot"
            >
              ×
            </button>
          </div>

          <div className="ai-chatbot-messages">
            {messages.map((item) => (
              <div
                key={item.id}
                className={`ai-message ${
                  item.type === 'user'
                    ? 'ai-message-user'
                    : 'ai-message-bot'
                }`}
              >
                {item.type === 'bot' ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="ai-markdown-p">
                          {children}
                        </p>
                      ),

                      strong: ({ children }) => (
                        <strong className="ai-markdown-bold">
                          {children}
                        </strong>
                      ),

                      ul: ({ children }) => (
                        <ul className="ai-markdown-list">
                          {children}
                        </ul>
                      ),

                      ol: ({ children }) => (
                        <ol className="ai-markdown-list">
                          {children}
                        </ol>
                      ),

                      li: ({ children }) => (
                        <li>{children}</li>
                      ),
                    }}
                  >
                    {item.text}
                  </ReactMarkdown>
                ) : (
                  item.text
                )}
              </div>
            ))}

            {isLoading && (
              <div className="ai-message ai-message-bot">
                <span className="ai-typing">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            )}

            {messages.length === 1 &&
              !isLoading && (
                <div className="ai-chatbot-suggestions">
                  {suggestions.map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() =>
                          sendMessage(
                            suggestion,
                          )
                        }
                      >
                        {suggestion}
                      </button>
                    ),
                  )}
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>

          <form
            className="ai-chatbot-input"
            onSubmit={handleSubmit}
          >
            <input
              type="text"
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              placeholder="Ask about food..."
              disabled={isLoading}
            />

            <button
              type="submit"
              aria-label="Send message"
              disabled={
                isLoading ||
                !message.trim()
              }
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}