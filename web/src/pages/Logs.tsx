import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  QrCode, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Logs() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000); // Atualiza a cada 15 segundos
    return () => clearInterval(interval);
  }, []);

  async function loadStatus() {
    const { data, error } = await supabase
      .from("settings")
      .select("bot_name, last_heartbeat, whatsapp_status, is_active")
      .single();

    if (!error && data) {
      setStatus(data);
    }
    setLoading(false);
  }

  // Verifica se o bot está "vivo" (se o último pulso foi há menos de 2 minutos)
  const isBotAlive = status?.last_heartbeat 
    ? (new Date().getTime() - new Date(status.last_heartbeat).getTime()) < 120000 
    : false;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Logs e Status</h1>
          <p className="text-sm text-muted-foreground">Monitorize a saúde do sistema e a ligação do WhatsApp.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); loadStatus(); }}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* CARD 1: STATUS DO BOT (SOFTWARE LOCAL) */}
        <Card className="card-elevated border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Status do Motor (PC Loja)
              </CardTitle>
              {isBotAlive ? (
                <Badge className="bg-success hover:bg-success text-white">Online</Badge>
              ) : (
                <Badge variant="destructive">Offline</Badge>
              )}
            </div>
            <CardDescription>Indica se o software do bot está a correr no computador da loja.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Último sinal de vida (Heartbeat):</span>
              <span className="font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {status?.last_heartbeat 
                  ? formatDistanceToNow(new Date(status.last_heartbeat), { addSuffix: true, locale: ptBR })
                  : "Nunca"}
              </span>
            </div>
            {!isBotAlive && (
              <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>O bot parece estar desligado. Certifique-se de que abriu o ficheiro <strong>INICIAR BOT.bat</strong> no computador da loja.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CARD 2: STATUS DA LIGAÇÃO WHATSAPP */}
        <Card className={`card-elevated border-l-4 ${status?.whatsapp_status === 'connected' ? 'border-l-success' : 'border-l-warning'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wifi className="h-5 w-5 text-primary" /> Ligação WhatsApp
              </CardTitle>
              {status?.whatsapp_status === 'connected' ? (
                <Badge className="bg-success hover:bg-success text-white">Conectado</Badge>
              ) : status?.whatsapp_status === 'connecting' ? (
                <Badge variant="secondary">Conectando...</Badge>
              ) : (
                <Badge variant="outline" className="text-warning border-warning">Aguardando QR</Badge>
              )}
            </div>
            <CardDescription>Estado da sessão entre o seu telemóvel e o bot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              {status?.whatsapp_status === 'connected' ? (
                <div className="flex items-center gap-2 text-success text-sm">
                  <CheckCircle2 className="h-4 w-4" /> Sessão ativa e pronta para responder.
                </div>
              ) : (
                <div className="flex items-center gap-2 text-warning text-sm">
                  <QrCode className="h-4 w-4" /> Necessário ler o QR Code no terminal do PC.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CARD 3: LOGS RECENTES (Simulados ou baseados em atividades) */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Histórico de Eventos</CardTitle>
          <CardDescription>Últimas ações realizadas pelo sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Aqui podes futuramente puxar de uma tabela 'system_logs' */}
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20 text-sm">
              <div className="h-2 w-2 mt-1.5 rounded-full bg-success" />
              <div className="flex-1">
                <p className="font-medium text-xs uppercase text-muted-foreground">Sistema Online</p>
                <p>O monitor de status está a ler os dados do Supabase corretamente.</p>
              </div>
            </div>
            {status?.is_active === false && (
              <div className="flex items-start gap-3 p-3 rounded-lg border bg-warning/10 text-sm border-warning/20">
                <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                <div className="flex-1 text-warning">
                  <p className="font-medium text-xs uppercase">Bot Desativado Globalmente</p>
                  <p>O atendimento automático está desligado nas Configurações do Bot.</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}