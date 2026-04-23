import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, User, Lock, LogOut, Save, ShieldCheck } from "lucide-react";

export default function Account() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Estados para alteração de senha
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    setUpdating(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha atualizada com sucesso!" });
      setPassword("");
      setConfirmPassword("");
    }
    setUpdating(false);
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Erro ao sair", description: error.message, variant: "destructive" });
    } else {
      window.location.href = "/login";
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minha Conta</h1>
        <p className="text-sm text-muted-foreground">Gerencie suas credenciais e segurança de acesso.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* INFORMAÇÕES DO PERFIL */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Dados de Perfil
            </CardTitle>
            <CardDescription>Informações da sua conta de administrador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground">E-mail de Acesso</Label>
              <div className="p-2 border rounded-md bg-muted/20 font-medium">
                {user?.email}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">ID do Usuário</Label>
              <p className="text-xs font-mono text-muted-foreground truncate">{user?.id}</p>
            </div>
            <div className="pt-4">
              <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Encerrar Sessão
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SEGURANÇA E SENHA */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> Segurança
            </CardTitle>
            <CardDescription>Atualize sua senha de acesso ao painel.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input 
                  id="new-password"
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input 
                  id="confirm-password"
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                />
              </div>
              <Button type="submit" className="w-full" disabled={updating || !password}>
                {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Atualizar Senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* DICA DE SEGURANÇA */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-primary">Sua conta está protegida</p>
          <p className="text-muted-foreground">
            Lembre-se de usar uma senha forte e única. Caso esqueça seus dados, entre em contato com o suporte técnico do sistema.
          </p>
        </div>
      </div>
    </div>
  );
}