import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { askRagChat, type RagChatMessage } from "../services/ragChatService";
import "./RagChat.css";

type Message = RagChatMessage & { id: string; sources?: string[] };

const greeting: Message = {
  id: "greeting",
  role: "assistant",
  content: "Olá! Posso consultar os dados fictícios do EV ChargeOPS. O que você quer saber?",
};

const suggestions = [
  "Qual foi o consumo por mês?",
  "Quais carregadores estão com falha?",
  "Qual o total faturado por referência?",
];

export function RagChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
      inputRef.current?.focus();
    }
  }, [open, messages, pending]);

  async function sendQuestion(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (!trimmed || pending || trimmed.length > 1_000) return;

    const history = messages
      .filter((message) => message.id !== "greeting")
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setError("");
    setPending(true);

    try {
      const result = await askRagChat(trimmed, history);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.answer,
          sources: result.sources,
        },
      ]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível responder agora. Tente novamente.",
      );
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(question);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendQuestion(question);
    }
  }

  function clearChat() {
    setMessages([greeting]);
    setQuestion("");
    setError("");
  }

  return (
    <div className="rag-chat">
      {open && (
        <section className="rag-chat__panel" aria-label="Chat EV ChargeOPS">
          <header className="rag-chat__header">
            <div>
              <p className="rag-chat__eyebrow">Assistente de dados</p>
              <h2>EV ChargeOPS</h2>
            </div>
            <div className="rag-chat__header-actions">
              <button
                className="rag-chat__icon-button"
                type="button"
                onClick={clearChat}
                aria-label="Limpar conversa"
                title="Limpar conversa"
                disabled={pending}
              >
                Limpar
              </button>
              <button
                className="rag-chat__icon-button"
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar chat"
                title="Fechar chat"
              >
                ×
              </button>
            </div>
          </header>

          <div className="rag-chat__messages" ref={logRef} role="log" aria-live="polite" aria-relevant="additions text">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`rag-chat__message rag-chat__message--${message.role}`}
              >
                <p>{message.content}</p>
                {message.sources && message.sources.length > 0 && (
                  <small className="rag-chat__sources">
                    Dados consultados: {message.sources.join(", ")}
                  </small>
                )}
              </article>
            ))}
            {pending && (
              <p className="rag-chat__pending" role="status">
                Consultando os dados…
              </p>
            )}
            {error && (
              <p className="rag-chat__error" role="alert">
                {error}
              </p>
            )}
            {messages.length === 1 && !pending && (
              <div className="rag-chat__suggestions" aria-label="Sugestões de perguntas">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendQuestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form className="rag-chat__form" onSubmit={handleSubmit}>
            <label className="rag-chat__sr-only" htmlFor="rag-chat-question">
              Escreva sua pergunta
            </label>
            <textarea
              id="rag-chat-question"
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={1_000}
              placeholder="Pergunte sobre consumo, sessões ou faturas…"
              rows={2}
              disabled={pending}
            />
            <button
              className="rag-chat__send"
              type="submit"
              disabled={pending || !question.trim()}
            >
              Enviar
            </button>
          </form>
          <p className="rag-chat__note">Dados fictícios · Conversa não é salva</p>
        </section>
      )}

      <button
        className="rag-chat__launcher"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="rag-chat-panel"
        aria-label={open ? "Fechar assistente de dados" : "Abrir assistente de dados"}
      >
        <span aria-hidden="true">✦</span>
        <span>Chat de dados</span>
      </button>
    </div>
  );
}
