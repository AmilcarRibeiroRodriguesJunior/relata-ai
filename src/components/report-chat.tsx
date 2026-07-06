import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Sparkles, User, Bot } from "lucide-react";
import { chatWithReport, type ChatMsg } from "@/lib/chat-report.functions";
import { toast } from "sonner";

const SUGGESTIONS = [
  { icon: "📈", text: "Explique as principais tendências" },
  { icon: "💰", text: "Onde posso aumentar o lucro?" },
  { icon: "⚠️", text: "Existem riscos preocupantes?" },
  { icon: "📊", text: "Resuma este relatório em poucas linhas" },
  { icon: "🎯", text: "Quais são as prioridades para os próximos 30 dias?" },
  { icon: "🔍", text: "Qual métrica teve o pior desempenho e por quê?" },
];

export function ReportChat({ reportId }: { reportId: string }) {
  const chat = useServerFn(chatWithReport);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await chat({ data: { reportId, messages: next } });
      setMessages([...next, { role: "assistant", content: res.text }]);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao conversar com o relatório");
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <Sparkles className="h-4 w-4 text-primary" />
        <div>
          <div className="text-sm font-semibold">Converse com seu Relatório</div>
          <div className="text-xs text-muted-foreground">A IA responde usando apenas os dados analisados.</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-10 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div className="text-sm text-muted-foreground">Pergunte qualquer coisa sobre este relatório.</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
            </div>
            <div className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-muted text-sm inline-flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Analisando…
            </div>
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.text}
              onClick={() => send(s.text)}
              className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted transition-colors"
            >
              <span className="mr-1">{s.icon}</span>{s.text}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="border-t p-3 flex gap-2 items-end"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Faça uma pergunta sobre o relatório…"
          rows={1}
          className="resize-none min-h-[42px] max-h-32"
          disabled={loading}
        />
        <Button type="submit" disabled={!input.trim() || loading} className="bg-gradient-primary shadow-elegant h-[42px]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
