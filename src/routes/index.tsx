import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Sparkles, FileText, BarChart3, Zap, Shield, Upload, Brain, Download,
  Check, ArrowRight, FileSpreadsheet, FileBarChart,
} from "lucide-react";
const logo = { url: "/__l5e/assets-v1/1f314b4c-c902-4ff5-9752-0e774182ffb8/relataai-logo.png" };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RelataAI — Transforme dados em relatórios inteligentes" },
      { name: "description", content: "Plataforma SaaS que transforma PDFs, Excel e CSV em relatórios executivos com resumos, KPIs, gráficos e insights por IA." },
      { property: "og:title", content: "RelataAI — Relatórios executivos com IA" },
      { property: "og:description", content: "PDF, Excel ou CSV em relatórios prontos em segundos." },
    ],
  }),
  component: Landing,
});

function Nav() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo.url} alt="RelataAI" className="h-10 w-10 object-contain" />
          <span className="font-display font-semibold text-lg">RelataAI</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
          <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
          <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Entrar</Button></Link>
          <Link to="/auth"><Button size="sm" className="bg-gradient-primary shadow-elegant hover:opacity-95">Começar grátis</Button></Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative bg-hero overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 lg:pt-32 lg:pb-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-4 py-1.5 text-xs text-muted-foreground mb-8">
          <Sparkles className="h-3 w-3 text-primary" />
          Relatórios executivos gerados por IA
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto">
          Transforme dados em <span className="text-gradient">relatórios inteligentes</span> em segundos.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Faça upload de PDFs, planilhas Excel ou CSVs e receba automaticamente um relatório executivo com resumos, KPIs, gráficos e insights gerados por IA.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="bg-gradient-primary shadow-glow hover:opacity-95 h-12 px-6">
              Começar gratuitamente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <a href="#como-funciona">
            <Button size="lg" variant="outline" className="h-12 px-6">Ver como funciona</Button>
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">3 relatórios gratuitos · Sem cartão de crédito</p>

        {/* Mock dashboard preview */}
        <div className="mt-16 relative max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
          <Card className="relative p-6 shadow-elegant border-border/60 bg-card/95 backdrop-blur text-left">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <span className="ml-2 text-xs text-muted-foreground">relatorio-vendas-q4.pdf</span>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: "Receita", value: "R$ 2.4M", trend: "+18%" },
                { label: "Conversão", value: "4.7%", trend: "+0.6pp" },
                { label: "Ticket médio", value: "R$ 312", trend: "+9%" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-lg border border-border bg-background p-4">
                  <div className="text-xs text-muted-foreground">{kpi.label}</div>
                  <div className="mt-1 text-2xl font-semibold">{kpi.value}</div>
                  <div className="text-xs text-success mt-1">{kpi.trend}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 h-32 rounded-lg border border-border bg-gradient-to-br from-primary/10 to-transparent flex items-end gap-2 p-4">
              {[40, 65, 50, 80, 70, 95, 85].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-primary rounded-t-md" style={{ height: `${h}%` }} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Upload, title: "Envie seu arquivo", desc: "Carregue PDF, Excel ou CSV com até 20MB." },
    { icon: Brain, title: "A IA analisa", desc: "Algoritmos extraem KPIs, padrões e insights relevantes." },
    { icon: Download, title: "Receba o relatório", desc: "Resumo executivo, gráficos e exportação em PDF." },
  ];
  return (
    <section id="como-funciona" className="py-24 border-t border-border/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs font-medium text-primary uppercase tracking-wider mb-3">Como funciona</div>
          <h2 className="text-4xl md:text-5xl font-bold">Três passos. Zero complicação.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <Card key={s.title} className="p-8 hover:shadow-elegant transition-all border-border/60 bg-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-mono text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground text-sm">{s.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: FileText, title: "Resumos executivos", desc: "Síntese clara dos pontos-chave dos seus dados." },
    { icon: BarChart3, title: "Gráficos automáticos", desc: "Visualizações geradas a partir das colunas detectadas." },
    { icon: Zap, title: "KPIs inteligentes", desc: "Identificação automática dos indicadores que importam." },
    { icon: Brain, title: "Insights por IA", desc: "Padrões, tendências e anomalias destacados." },
    { icon: FileSpreadsheet, title: "Múltiplos formatos", desc: "PDF, Excel, CSV — tudo num só lugar." },
    { icon: Shield, title: "Privacidade garantida", desc: "Seus dados ficam protegidos e isolados por conta." },
  ];
  return (
    <section id="recursos" className="py-24 border-t border-border/60 bg-muted/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs font-medium text-primary uppercase tracking-wider mb-3">Recursos</div>
          <h2 className="text-4xl md:text-5xl font-bold">Tudo o que você precisa para decisões rápidas.</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="p-6 border-border/60 bg-card hover:border-primary/40 transition-colors">
              <f.icon className="h-5 w-5 text-primary mb-3" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="planos" className="py-24 border-t border-border/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs font-medium text-primary uppercase tracking-wider mb-3">Planos</div>
          <h2 className="text-4xl md:text-5xl font-bold">Simples e transparente.</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="p-8 border-border/60">
            <div className="text-sm font-medium text-muted-foreground">Free</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-5xl font-bold">R$0</span>
              <span className="text-muted-foreground text-sm">/mês</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Perfeito para experimentar.</p>
            <ul className="mt-6 space-y-3 text-sm">
              {["3 uploads gratuitos", "Resumo executivo", "Exportação PDF básica"].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{f}</li>
              ))}
            </ul>
            <Link to="/auth" className="block mt-8">
              <Button variant="outline" className="w-full">Começar grátis</Button>
            </Link>
          </Card>
          <Card className="p-8 border-primary/40 shadow-glow relative bg-gradient-to-b from-primary/5 to-transparent">
            <div className="absolute -top-3 left-8 px-3 py-1 bg-gradient-primary text-primary-foreground text-xs font-medium rounded-full">
              Mais popular
            </div>
            <div className="text-sm font-medium text-primary">Pro</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-5xl font-bold">R$12,90</span>
              <span className="text-muted-foreground text-sm">/mês</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Para quem usa todos os dias.</p>
            <ul className="mt-6 space-y-3 text-sm">
              {["Uploads ilimitados", "Histórico completo", "Relatórios avançados", "Gráficos detalhados", "Insights premium", "Exportação avançada"].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{f}</li>
              ))}
            </ul>
            <Link to="/auth" className="block mt-8">
              <Button className="w-full bg-gradient-primary shadow-elegant hover:opacity-95">Assinar Pro</Button>
            </Link>
          </Card>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    { q: "Quais formatos posso enviar?", a: "PDF, Excel (.xlsx, .xls) e CSV, com até 20MB por arquivo." },
    { q: "Meus dados estão seguros?", a: "Sim. Cada usuário possui um espaço isolado com autenticação obrigatória, e os arquivos só podem ser acessados pelo dono." },
    { q: "Posso cancelar quando quiser?", a: "Sim. O plano Pro é mensal e pode ser cancelado a qualquer momento." },
    { q: "Como a IA gera os relatórios?", a: "Analisamos a estrutura do arquivo, extraímos métricas e produzimos um resumo executivo com KPIs e insights." },
  ];
  return (
    <section id="faq" className="py-24 border-t border-border/60 bg-muted/30">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="text-xs font-medium text-primary uppercase tracking-wider mb-3">FAQ</div>
          <h2 className="text-4xl md:text-5xl font-bold">Perguntas frequentes</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border border-border/60 rounded-lg px-4 bg-card">
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 border-t border-border/60">
      <div className="max-w-5xl mx-auto px-6">
        <Card className="p-12 lg:p-16 text-center bg-gradient-primary text-primary-foreground border-0 shadow-glow relative overflow-hidden">
          <FileBarChart className="absolute right-8 bottom-8 h-40 w-40 opacity-10" />
          <h2 className="text-4xl md:text-5xl font-bold">Pronto para acelerar suas decisões?</h2>
          <p className="mt-4 text-lg opacity-90 max-w-xl mx-auto">Crie sua conta gratuita e gere seu primeiro relatório agora.</p>
          <Link to="/auth" className="inline-block mt-8">
            <Button size="lg" variant="secondary" className="h-12 px-8">
              Começar agora <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-gradient-primary flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-primary-foreground" />
          </div>
          <span>© {new Date().getFullYear()} RelataAI — Transforme dados em decisões.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#planos" className="hover:text-foreground">Planos</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </div>
      </div>
    </footer>
  );
}

function WhyRelataAI() {
  const benefits = [
    { icon: Clock, title: "Economize horas de análise", desc: "Chega de montar planilhas e slides manualmente. A IA faz em segundos." },
    { icon: Briefcase, title: "Relatórios profissionais em segundos", desc: "Documentos executivos prontos para apresentar a diretoria ou clientes." },
    { icon: TrendingUp, title: "Descubra tendências automaticamente", desc: "Correlações, anomalias e padrões que passariam despercebidos." },
    { icon: Target, title: "Decisões baseadas em dados", desc: "KPIs claros, alertas priorizados e recomendações estratégicas." },
  ];
  return (
    <section className="py-24 border-t border-border/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs font-medium text-primary uppercase tracking-wider mb-3">Por que RelataAI</div>
          <h2 className="text-4xl md:text-5xl font-bold">O trabalho de uma consultoria BI, em segundos.</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map((b) => (
            <Card key={b.title} className="p-6 hover:shadow-elegant hover:border-primary/40 transition-all">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{b.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{b.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReportExample() {
  return (
    <section className="py-24 border-t border-border/60 bg-muted/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs font-medium text-primary uppercase tracking-wider mb-3">Veja um exemplo</div>
          <h2 className="text-4xl md:text-5xl font-bold">Assim é um relatório RelataAI.</h2>
          <p className="text-muted-foreground mt-4">Score, KPIs, insights, gráficos e conclusão executiva — tudo em uma única entrega.</p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-gradient-primary opacity-15 blur-3xl rounded-full" />
          <Card className="relative overflow-hidden border-border/60 shadow-elegant">
            {/* Header */}
            <div className="bg-gradient-to-br from-secondary via-secondary to-primary text-primary-foreground p-6 grid md:grid-cols-[auto_1fr] gap-6 items-center">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Score RelataAI</div>
                <div className="text-5xl font-bold">87</div>
                <div className="mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-100 border border-emerald-400/40">Muito bom</div>
              </div>
              <div>
                <h3 className="text-xl font-bold">Vendas Q4 · Análise Executiva</h3>
                <p className="text-sm opacity-90 mt-1">Receita cresceu 18% no trimestre, com forte concentração no segmento premium. Detectadas 3 oportunidades e 1 alerta.</p>
              </div>
            </div>
            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { l: "Receita", v: "R$ 2,4M", t: "+18%" },
                  { l: "Ticket médio", v: "R$ 312", t: "+9%" },
                  { l: "Conversão", v: "4,7%", t: "+0,6pp" },
                  { l: "Clientes", v: "3.812", t: "+22%" },
                ].map((k) => (
                  <div key={k.l} className="rounded-lg border border-border p-3 border-l-4 border-l-emerald-500">
                    <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">{k.l}</div>
                    <div className="text-xl font-bold mt-1">{k.v}</div>
                    <div className="text-xs text-emerald-600 font-medium">{k.t}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Evolução mensal</div>
                <div className="h-32 flex items-end gap-2">
                  {[40, 55, 48, 72, 65, 88, 82, 95].map((h, i) => (
                    <div key={i} className="flex-1 bg-gradient-primary rounded-t-md" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-lg border-l-4 border-l-primary bg-primary/5 p-3 text-sm">
                  💡 Segmento <strong>Premium</strong> concentra 62% da receita — considere programa de retenção.
                </div>
                <div className="rounded-lg border-l-4 border-l-amber-500 bg-amber-50/50 p-3 text-sm">
                  ⚠️ Ticket médio caiu 4% no canal digital nas últimas 2 semanas.
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="text-center mt-10">
          <Link to="/auth">
            <Button size="lg" className="bg-gradient-primary shadow-elegant h-12 px-6">
              Gerar meu primeiro relatório <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />
        <WhyRelataAI />
        <HowItWorks />
        <ReportExample />
        <Features />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
