import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Send, User, PauseCircle, PlayCircle, Loader2, MessageSquareOff } from "lucide-react";
import { format } from "date-fns";

export default function Conversations() {
  const [searchParams] = useSearchParams();
  const preSelectedCustomerId = searchParams.get("customer");

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carrega a lista de conversas
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Polling para mensagens do chat aberto
  useEffect(() => {
    if (activeId) {
      loadMessages(activeId);
      const interval = setInterval(() => loadMessages(activeId), 5000);
      return () => clearInterval(interval);
    }
  }, [activeId]);

  // Seleção automática se vier da tela de clientes
  useEffect(() => {
    if (preSelectedCustomerId && conversations.length > 0 && !activeId) {
      const convo = conversations.find(c => c.customers?.id === preSelectedCustomerId);
      if (convo) setActiveId(convo.id);
    }
  }, [preSelectedCustomerId, conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversations() {
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id, 
        bot_paused,
        last_message_at,
        customers ( id, name, phone )
      `) // Alterado de status para bot_paused
      .order("last_message_at", { ascending: false });

    if (!error && data) {
      setConversations(data);
      if (loading) setLoading(false);
    }
  }

  async function loadMessages(conversationId: string) {
    if (!loadingMessages && messages.length === 0) setLoadingMessages(true);
    
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
    setLoadingMessages(false);
  }

  // Correção: Atualizando bot_paused em vez de status
  async function toggleBotStatus(conversationId: string, currentPaused: boolean) {
    const { error } = await supabase
      .from("conversations")
      .update({ bot_paused: !currentPaused }) 
      .eq("id", conversationId);

    if (error) {
      toast({ title: "Erro ao alterar status", description: error.message, variant: "destructive" });
    } else {
      toast({ title: !currentPaused ? "Bot Pausado (Atendimento Humano)" : "Bot Reativado" });
      loadConversations();
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !activeId) return;

    const activeConvo = conversations.find(c => c.id === activeId);
    if (!activeConvo) return;

    setSending(true);
    
    const { error } = await supabase
      .from("outbound_messages")
      .insert([{
        conversation_id: activeId,
        text: newMessage.trim(),
        status: "pending"
      }]);

    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } else {
      setNewMessage("");
      setTimeout(() => loadMessages(activeId), 1500); 
    }
    setSending(false);
  }

  const activeConvo = conversations.find(c => c.id === activeId);

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4 overflow-hidden">
      {/* PAINEL ESQUERDO */}
      <Card className="w-1/3 flex flex-col overflow-hidden border-muted">
        <div className="p-4 border-b bg-muted/20">
          <h2 className="font-semibold">Conversas Ativas</h2>
        </div>
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</div>
          ) : (
            <div className="divide-y">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 ${
                    activeId === c.id ? "bg-muted" : ""
                  }`}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback>{c.customers?.name?.substring(0, 2).toUpperCase() || <User className="h-4 w-4"/>}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium truncate">{c.customers?.name || c.customers?.phone}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {c.last_message_at ? format(new Date(c.last_message_at), "HH:mm") : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={c.bot_paused ? "outline" : "default"} className="text-[10px] px-1 py-0 h-4">
                        {c.bot_paused ? "Humano" : "Bot"}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">{c.customers?.phone}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* PAINEL DIREITO */}
      <Card className="flex-1 flex flex-col overflow-hidden border-muted">
        {activeConvo ? (
          <>
            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{activeConvo.customers?.name?.substring(0, 2).toUpperCase() || <User className="h-4 w-4"/>}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{activeConvo.customers?.name || "Cliente"}</h2>
                  <p className="text-sm text-muted-foreground">{activeConvo.customers?.phone}</p>
                </div>
              </div>
              <Button 
                variant={activeConvo.bot_paused ? "default" : "secondary"}
                onClick={() => toggleBotStatus(activeConvo.id, activeConvo.bot_paused)}
              >
                {activeConvo.bot_paused ? (
                  <><PlayCircle className="mr-2 h-4 w-4" /> Reativar Bot</>
                ) : (
                  <><PauseCircle className="mr-2 h-4 w-4" /> Assumir Conversa</>
                )}
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4 bg-slate-50/50 dark:bg-transparent">
              {loadingMessages ? (
                <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground text-sm">Nenhuma mensagem neste chat.</div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => {
                    const isCustomer = m.direction === "inbound";
                    return (
                      <div key={m.id} className={`flex flex-col ${isCustomer ? "items-start" : "items-end"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {m.author === "bot" ? "🤖 Bot" : m.author === "human" ? "👨‍💻 Você" : "👤 Cliente"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(m.created_at), "HH:mm")}
                          </span>
                        </div>
                        <div className={`max-w-[75%] rounded-lg p-3 text-sm shadow-sm ${
                          isCustomer 
                            ? "bg-white dark:bg-slate-800 border" 
                            : "bg-primary text-primary-foreground"
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <form onSubmit={sendMessage} className="p-4 border-t bg-background flex gap-2">
              <Input 
                placeholder={activeConvo.bot_paused ? "Digite a sua mensagem..." : "Pause o bot para falar manualmente..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
              />
              <Button type="submit" disabled={!newMessage.trim() || sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquareOff className="h-12 w-12 mb-4 opacity-20" />
            <p>Selecione uma conversa ao lado para visualizar.</p>
          </div>
        )}
      </Card>
    </div>
  );
}