import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Check, HeartPulse, Stethoscope, Wheat, GraduationCap,
  Landmark, Briefcase, Route, MapPin, Award, CalendarDays,
} from 'lucide-react';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { options } from '../config/enums.js';
import '../styles/landing.css';

/* ===== Dados para a prova social (escopo de módulo: não recriar a cada render) ===== */
const NOMES = [
  'Mateus','Lucas','Gabriel','Pedro','João','Felipe','Rafael','Bruno','Thiago','Vinícius','Eduardo','Gustavo',
  'Leonardo','Rodrigo','Marcelo','Fernando','Ricardo','André','Diego','Henrique','Carlos','Paulo','Daniel','Fábio',
  'Alexandre','Júlio','César','Renato','Maurício','Anderson','Cristiano','Émerson','Jonas','Augusto','Otávio','Caio',
  'Cleber','Volnei','Ademar','Nelson','Valdir','Sérgio','Jair','Ivo','Délcio','Ari','Hélio','José','Antônio',
  'Francisco','Luiz','Mário','Adilson','Gilberto','Rogério','Sandro','Joel','Everton','Maicon','Wagner','Cláudio',
  'Ana','Maria','Júlia','Beatriz','Larissa','Fernanda','Camila','Bruna','Carolina','Letícia','Amanda','Gabriela',
  'Mariana','Patrícia','Aline','Vanessa','Daniela','Juliana','Renata','Tatiane','Cristiane','Sabrina','Débora','Priscila',
  'Eduarda','Manuela','Helena','Valentina','Laura','Isabela','Sofia','Alice','Lívia','Cecília','Antônia','Rafaela',
  'Bianca','Carla','Adriana','Simone','Elaine','Roberta','Michele','Andréa','Luana','Natália','Jéssica','Franciele',
  'Graziela','Taís','Rosane','Marlene','Salete','Ivone','Neusa','Terezinha','Verônica','Joana','Marta',
];
const CIDADES = [
  'Venâncio Aires','Lajeado','Estrela','Teutônia','Encantado','Arroio do Meio','Taquari','Cruzeiro do Sul',
  'Bom Retiro do Sul','Roca Sales','Mato Leitão','Santa Clara do Sul','Progresso','Marques de Souza','Colinas',
  'Imigrante','Westfália','Paverama','Fazenda Vilanova','Muçum','Santa Cruz do Sul','Vera Cruz','Sobradinho',
  'Barros Cassal','Soledade','Porto Alegre','Canoas','Gravataí','Novo Hamburgo','São Leopoldo','Esteio',
  'Caxias do Sul','Bento Gonçalves','Farroupilha','Passo Fundo','Santa Maria','Erechim','Ijuí','Santo Ângelo',
  'Pelotas','Rio Grande','Bagé','Uruguaiana','Alegrete','Gramado','Canela','Torres','Osório','Tramandaí',
];
const VERBOS = ['apoia a pré-campanha!','entrou no movimento!','virou voluntário!','se juntou à caminhada!','quer o Vale mais forte!'];
const TEMPOS = ['agora mesmo','há poucos segundos','há instantes'];
const CORES = [['#1B1D39','#0C0D1D'],['#398254','#1D4630'],['#BD2E2F','#8A1F20'],['#B98618','#7d5a0d'],['#3554A5','#22376e']];

function gerarPool() {
  const pool = [];
  const seen = new Set();
  let guard = 0;
  while (pool.length < 1000 && guard < 60000) {
    guard++;
    const n = NOMES[(Math.random() * NOMES.length) | 0];
    const c = CIDADES[(Math.random() * CIDADES.length) | 0];
    const k = n + '|' + c;
    if (!seen.has(k)) { seen.add(k); pool.push([n, c]); }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/* ============================== PÁGINA ============================== */
export default function Landing() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  // imã — propostas da pré-campanha
  const [lead, setLead] = useState({ name: '', email: '', phone: '' });
  const [leadSent, setLeadSent] = useState(false);
  const [leadSending, setLeadSending] = useState(false);

  // participar (CTA final)
  const [form, setForm] = useState({ supportType: 'VOLUNTARIO' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  // prova social
  const [toasts, setToasts] = useState([]);
  const poolRef = useRef(gerarPool());
  const idxRef = useRef(0);

  useEffect(() => {
    api.get('/public/stats').then((r) => setStats(r.data)).catch(() => {});
  }, []);

  // header scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // reveal on scroll
  useEffect(() => {
    const els = document.querySelectorAll('.mlp-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    els.forEach((el, i) => { el.style.transitionDelay = (i % 6) * 60 + 'ms'; io.observe(el); });
    return () => io.disconnect();
  }, []);

  // prova social: 1 toast a cada 12s, some após ~9s
  useEffect(() => {
    let alive = true;
    function next() {
      if (!alive) return;
      if (idxRef.current >= poolRef.current.length) { poolRef.current = gerarPool(); idxRef.current = 0; }
      const [nome, cidade] = poolRef.current[idxRef.current++];
      const verbo = VERBOS[(Math.random() * VERBOS.length) | 0];
      const tempo = TEMPOS[(Math.random() * TEMPOS.length) | 0];
      const cor = CORES[(Math.random() * CORES.length) | 0];
      const id = Date.now() + '-' + Math.random();
      setToasts((t) => [...t, { id, nome, cidade, verbo, tempo, cor }]);
      // marca saída
      setTimeout(() => setToasts((t) => t.map((x) => (x.id === id ? { ...x, out: true } : x))), 8500);
      // remove do DOM
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 9100);
    }
    const start = setTimeout(() => { next(); }, 4000);
    const iv = setInterval(next, 12000);
    return () => { alive = false; clearTimeout(start); clearInterval(iv); };
  }, []);

  async function submitLead(e) {
    e.preventDefault();
    setLeadSending(true);
    try {
      await api.post('/public/join', {
        name: lead.name,
        phone: lead.phone,
        email: lead.email || undefined,
        cityName: 'Venâncio Aires',
        supportType: 'MATERIAL_DIGITAL',
      });
      setLeadSent(true);
      toast.success('Propostas a caminho do seu WhatsApp!');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLeadSending(false);
    }
  }

  async function submitJoin(e) {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/public/join', { ...form, cityName: form.cityName || 'Venâncio Aires' });
      setSent(true);
      toast.success('Cadastro recebido! Obrigado por caminhar junto.');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSending(false);
    }
  }

  const fmt = (n) => (n == null ? '—' : n);
  // Só exibe o bloco de números quando a base já tem movimento real.
  const hasStats = !!(stats && (stats.supporters || stats.volunteers || stats.actions || stats.banners));

  return (
    <div className="mlp">
      {/* HEADER */}
      <header className={'mlp-header' + (scrolled ? ' scrolled' : '')}>
        <div className="mlp-tricolor" aria-hidden="true"><i className="g" /><i className="r" /><i className="y" /></div>
        <div className="mlp-wrap mlp-bar">
          <a href="#topo" className="mlp-brand">
            <span className="wm">
              <b>Airton Artus</b>
              <small>Pré-candidato a Deputado Estadual · RS</small>
            </span>
          </a>
          <nav className="mlp-menu" aria-label="Navegação principal">
            <a className="mlp-navlink" href="#trajetoria">Trajetória</a>
            <a className="mlp-navlink" href="#bandeiras">Bandeiras</a>
            <a className="mlp-navlink" href="#resultados">Resultados</a>
            <a className="mlp-navlink" href="#redes">Redes</a>
            <Link to="/login" className="mlp-enter">Entrar no sistema</Link>
            <a href="#apoie" className="mlp-btn mlp-btn--primary">Participe</a>
          </nav>
        </div>
      </header>

      {/* HERO — foto real ao púlpito com as bandeiras do Brasil e do RS */}
      <section className="mlp-hero" id="topo">
        <div className="mlp-hero-photo" role="img" aria-label="Airton Artus discursa ao púlpito com as bandeiras do Brasil e do Rio Grande do Sul" />
        <div className="mlp-hero-shade" />
        <div className="mlp-wrap mlp-hero-content">
          <span className="mlp-eyebrow"><Stethoscope size={14} /> Médico · Ex-prefeito de Venâncio Aires · Deputado Estadual</span>
          <h1>Meu lado é o<br /><span className="accent">da saúde.</span></h1>
          <p className="mlp-lead">
            Uma vida inteira cuidando de gente: 40 anos de medicina, dois mandatos de prefeito
            e um mandato de deputado trabalhando por saúde, infraestrutura e desenvolvimento
            para o Vale do Taquari e todo o Rio Grande do Sul.
          </p>
          <div className="mlp-cta">
            <a href="#apoie" className="mlp-btn mlp-btn--primary">Quero participar <ArrowRight size={18} /></a>
            <a href="#trajetoria" className="mlp-btn mlp-btn--ghost">Conhecer a trajetória</a>
          </div>
          <div className="mlp-trust">
            <span className="mlp-pill"><b>24.319</b> votos em 2022</span>
            <span className="mlp-pill"><b>2</b> mandatos de prefeito</span>
            <span className="mlp-pill"><b>40</b> anos de medicina</span>
          </div>
        </div>
        <div className="mlp-scroll"><div className="mlp-mouse" />role para conhecer</div>
      </section>

      {/* MARQUEE */}
      <div className="mlp-marquee" aria-hidden="true">
        <div className="mlp-track">
          <span>Saúde <i>•</i> Vale do Taquari <i>•</i> Agricultura Familiar <i>•</i> Educação <i>•</i> Infraestrutura <i>•</i> Municipalismo <i>•</i> Trabalho <i>•</i></span>
          <span>Saúde <i>•</i> Vale do Taquari <i>•</i> Agricultura Familiar <i>•</i> Educação <i>•</i> Infraestrutura <i>•</i> Municipalismo <i>•</i> Trabalho <i>•</i></span>
        </div>
      </div>

      {/* STATS (ao vivo) — só aparece quando a base já tem movimento */}
      {hasStats && (
        <section className="mlp-block">
          <div className="mlp-wrap">
            <div className="mlp-stats">
              <div className="mlp-stat mlp-reveal"><b>{fmt(stats?.supporters)}</b><span>Apoiadores</span></div>
              <div className="mlp-stat mlp-reveal"><b>{fmt(stats?.volunteers)}</b><span>Voluntários</span></div>
              <div className="mlp-stat mlp-reveal"><b>{fmt(stats?.actions)}</b><span>Ações pelo RS</span></div>
              <div className="mlp-stat mlp-reveal"><b>{fmt(stats?.banners)}</b><span>Faixas nas casas</span></div>
            </div>
          </div>
        </section>
      )}

      {/* TRAJETÓRIA */}
      <section className="mlp-block mlp-soft" id="trajetoria">
        <div className="mlp-wrap">
          <div className="mlp-head mlp-reveal">
            <span className="mlp-eyebrow">Quem é Airton Artus</span>
            <h2>Do consultório à Assembleia</h2>
            <p>Médico formado em 1983, Airton construiu sua vida pública cuidando das pessoas — no consultório, na prefeitura e no parlamento.</p>
          </div>
          <div className="mlp-bio">
            <figure className="mlp-bio-photo mlp-reveal">
              <img src="/img/saude.jpg" alt="Dr. Airton Artus de jaleco, analisando exames no consultório" loading="lazy" />
              <figcaption>Dr. Airton Artus — médico há mais de 40 anos</figcaption>
            </figure>
            <div className="mlp-timeline">
              <Tl yr="1983" t="Formado em Medicina" d="Clínico geral na saúde pública e privada, começou a carreira cuidando de quem mais precisa." />
              <Tl yr="1991" t="Coordenador Regional de Saúde" d="Acompanhou de dentro a criação e a implantação do SUS na região." />
              <Tl yr="1993" t="Diretor clínico do Hospital São Sebastião Mártir" d="Liderança médica no principal hospital de Venâncio Aires." />
              <Tl yr="1997" t="Vereador por dois mandatos" d="Primeira missão pública em Venâncio Aires (1997–2004), seguida do período como vice-prefeito (2005–2008)." />
              <Tl yr="2009" t="Prefeito de Venâncio Aires — 2 mandatos" d="Oito anos de gestão (2009–2016) com marca de trabalho sério e cuidado com as pessoas." />
              <Tl yr="2023" t="Deputado Estadual" d="Na Assembleia Legislativa do RS, destinou recursos para saúde e infraestrutura da região." />
              <Tl yr="2026" t="Pré-candidato a Deputado Estadual" d="De volta ao Vale do Taquari para ampliar a representação da região na Assembleia." />
            </div>
          </div>
        </div>
      </section>

      {/* BANDEIRAS */}
      <section className="mlp-block" id="bandeiras">
        <div className="mlp-wrap">
          <div className="mlp-head mlp-reveal">
            <span className="mlp-eyebrow">O que defendemos</span>
            <h2>Bandeiras que mudam a vida real</h2>
            <p>Prioridades construídas em 40 anos de escuta — no consultório, nas comunidades do interior e nos municípios do Rio Grande.</p>
          </div>
          <div className="mlp-pillars">
            <Pillar ico={<HeartPulse size={26} />} t="Saúde pública de verdade" d="Menos fila e mais atendimento: fortalecimento dos hospitais regionais, dos postos de saúde e do SUS que o Airton ajudou a implantar." />
            <Pillar ico={<Route size={26} />} t="Infraestrutura e estradas" d="Pavimentação e manutenção das estradas do interior, ligando as comunidades à cidade e o produtor ao mercado." />
            <Pillar ico={<Wheat size={26} />} t="Agricultura familiar" d="Apoio a quem produz: assistência técnica, escoamento da produção e valorização do produtor do Vale." />
            <Pillar ico={<GraduationCap size={26} />} t="Educação e futuro" d="Escola de qualidade e oportunidades para os jovens ficarem e crescerem na própria região." />
            <Pillar ico={<Landmark size={26} />} t="Municipalismo" d="Quem foi prefeito sabe: recursos e autonomia para os municípios resolverem a vida das pessoas na ponta." />
            <Pillar ico={<Briefcase size={26} />} t="Trabalho e desenvolvimento" d="Ambiente favorável para a indústria, o comércio e os serviços gerarem emprego e renda no interior." />
          </div>
        </div>
      </section>

      {/* RESULTADOS */}
      <section className="mlp-block mlp-dark" id="resultados">
        <div className="mlp-wrap">
          <div className="mlp-head mlp-reveal">
            <span className="mlp-eyebrow">Trabalho que aparece</span>
            <h2>Resultados de mandato</h2>
            <p>Números de uma trajetória dedicada à região — com recurso público tratado com o respeito que ele merece.</p>
          </div>
          <div className="mlp-results">
            <Resultado v="R$ 10,7 mi" t="Investimento em pavimentação" d="6 km de asfalto entre Grão-Pará e Linha Travessa, no interior de Venâncio Aires." ico={<Route size={22} />} />
            <Resultado v="24.319" t="Votos em 2022" d="Quinto mais votado do PDT no estado, assumindo o mandato em fevereiro de 2023." ico={<Award size={22} />} />
            <Resultado v="3,5 anos" t="De mandato na Assembleia" d="Atuação firme por saúde, infraestrutura e municípios na 56ª legislatura." ico={<Landmark size={22} />} />
            <Resultado v="8 anos" t="À frente de Venâncio Aires" d="Dois mandatos consecutivos de prefeito (2009–2016), além de vice-prefeito e vereador." ico={<MapPin size={22} />} />
          </div>
        </div>
      </section>

      {/* GALERIA — O RIO GRANDE DE PERTO */}
      <section className="mlp-block">
        <div className="mlp-wrap">
          <div className="mlp-head mlp-reveal">
            <span className="mlp-eyebrow">Pé no chão, olho no olho</span>
            <h2>O Rio Grande de perto</h2>
          </div>
          <div className="mlp-gallery">
            <figure className="mlp-shot wide mlp-reveal">
              <img src="/img/mobilizacao.jpg" alt="Militância reunida em pavilhão no interior, com bandeiras do PDT" loading="lazy" />
              <figcaption>Mobilização no interior do Vale</figcaption>
            </figure>
            <figure className="mlp-shot mlp-reveal">
              <img src="/img/proximidade.jpg" alt="Airton Artus segurando as mãos de uma senhora, em conversa próxima" loading="lazy" />
              <figcaption>Escuta de verdade, pessoa por pessoa</figcaption>
            </figure>
            <figure className="mlp-shot mlp-reveal">
              <img src="/img/escuta.jpg" alt="Airton Artus conversando de perto com moradoras em evento comunitário" loading="lazy" />
              <figcaption>Comunidade em primeiro lugar</figcaption>
            </figure>
            <figure className="mlp-shot mlp-reveal">
              <img src="/img/familia.jpg" alt="Airton Artus no parreiral com o neto, segurando um cesto de uvas" loading="lazy" />
              <figcaption>Raízes no interior gaúcho</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* IMÃ — Propostas */}
      <section className="mlp-block mlp-soft" id="propostas">
        <div className="mlp-wrap">
          <div className="mlp-magnet mlp-reveal">
            <div className="mlp-magnet-inner">
              <div>
                <span className="mlp-eyebrow">Material exclusivo · Grátis</span>
                <h2>Receba as propostas completas</h2>
                <p>Deixe seu contato e receba no WhatsApp o material da pré-campanha — prioridades por área, agenda de encontros e as novidades em primeira mão.</p>
                <ul>
                  <li><Check size={22} /> Prioridades detalhadas por área</li>
                  <li><Check size={22} /> Resultados e prestação de contas</li>
                  <li><Check size={22} /> Agenda de encontros perto de você</li>
                </ul>
              </div>
              <div className="mlp-form">
                {leadSent ? (
                  <div className="mlp-ok">
                    <Check size={54} />
                    <h3>Recebido!</h3>
                    <p>Em instantes você recebe o material. Obrigado por caminhar conosco!</p>
                  </div>
                ) : (
                  <form onSubmit={submitLead}>
                    <h3>Receba agora, é grátis</h3>
                    <p className="sub">Preencha e enviamos o material.</p>
                    <div className="mlp-field"><label className="sr-only" htmlFor="lead-name">Seu nome</label><input id="lead-name" placeholder="Seu nome" value={lead.name} onChange={(e) => setLead((s) => ({ ...s, name: e.target.value }))} required /></div>
                    <div className="mlp-field"><label className="sr-only" htmlFor="lead-phone">WhatsApp</label><input id="lead-phone" placeholder="WhatsApp (DDD + número)" value={lead.phone} onChange={(e) => setLead((s) => ({ ...s, phone: e.target.value }))} required /></div>
                    <div className="mlp-field"><label className="sr-only" htmlFor="lead-email">E-mail (opcional)</label><input id="lead-email" type="email" placeholder="Seu e-mail (opcional)" value={lead.email} onChange={(e) => setLead((s) => ({ ...s, email: e.target.value }))} /></div>
                    <button className="mlp-btn mlp-btn--primary mlp-btn--block" disabled={leadSending}>
                      {leadSending ? 'Enviando...' : 'Quero receber as propostas'}
                    </button>
                    <p className="privacy">Seus dados estão protegidos (LGPD) e não serão compartilhados.</p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VISION */}
      <section className="mlp-block mlp-vision">
        <div className="mlp-wrap">
          <blockquote>Passei a vida do lado de quem precisa de cuidado. Na Assembleia, <span className="hl">meu lado é o da saúde</span> — e o do Rio Grande que trabalha.</blockquote>
          <div className="mlp-by">
            <img src="/candidato.jpg" alt="Retrato de Airton Artus" loading="lazy" />
            <div style={{ textAlign: 'left' }}><b>Airton Artus</b><span>Médico · Pré-candidato a Deputado Estadual</span></div>
          </div>
        </div>
      </section>

      {/* REDES SOCIAIS */}
      <section className="mlp-block mlp-social" id="redes">
        <div className="mlp-wrap">
          <div className="mlp-head mlp-reveal">
            <span className="mlp-eyebrow">Vem com a gente</span>
            <h2>Acompanhe de perto</h2>
            <p>Bastidores, agenda e conquistas da pré-campanha em primeira mão. Siga, comente e compartilhe — sua voz fortalece o movimento.</p>
          </div>
          <div className="mlp-soc-grid">
            <a href="https://instagram.com/airton.artus" target="_blank" rel="noopener noreferrer" className="mlp-soc ig mlp-reveal">
              <div className="top">
                <div className="ic"><IgIcon /></div>
                <span className="live"><span className="dot" /> No ar</span>
              </div>
              <div>
                <h3>Instagram</h3>
                <div className="handle">@airton.artus</div>
                <span className="go">Seguir <ArrowRight size={16} /></span>
              </div>
              <span className="bgnum">IG</span>
            </a>

            <a href="#apoie" className="mlp-soc wa mlp-reveal">
              <div className="top">
                <div className="ic"><WaIcon big /></div>
                <span className="live"><span className="dot" /> Equipe online</span>
              </div>
              <div>
                <h3>WhatsApp</h3>
                <div className="handle">Grupos da pré-campanha</div>
                <span className="go">Quero entrar <ArrowRight size={16} /></span>
              </div>
              <span className="bgnum">W</span>
            </a>

            <a href="#propostas" className="mlp-soc nv mlp-reveal">
              <div className="top">
                <div className="ic"><CalendarDays size={28} /></div>
                <span className="live"><span className="dot" /> Toda semana</span>
              </div>
              <div>
                <h3>Agenda no interior</h3>
                <div className="handle">Encontros por todo o Vale</div>
                <span className="go">Receber avisos <ArrowRight size={16} /></span>
              </div>
              <span className="bgnum">AG</span>
            </a>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="mlp-block">
        <div className="mlp-wrap">
          <div className="mlp-head mlp-reveal">
            <span className="mlp-eyebrow">Vozes do Rio Grande</span>
            <h2>Quem caminha junto</h2>
          </div>
          <div className="mlp-cards">
            <Quote ini="RM" nome="Rosane M." loc="Moradora · Venâncio Aires" txt="O doutor Airton atendeu minha família a vida inteira. Como prefeito, cuidou da cidade do mesmo jeito: de perto." />
            <Quote ini="JS" nome="João S." loc="Produtor rural · Linha Travessa" txt="O asfalto que chegou até a nossa comunidade mudou o dia a dia de quem produz. É trabalho que aparece." />
            <Quote ini="AP" nome="Ana P." loc="Enfermeira · Lajeado" txt="Ter um médico na Assembleia faz diferença. Ele conhece o SUS por dentro e briga pelas pessoas certas." />
          </div>
          <p className="mlp-note">* Depoimentos ilustrativos — serão substituídos por depoimentos reais autorizados.</p>
        </div>
      </section>

      {/* CTA FINAL + PARTICIPAR */}
      <section className="mlp-block mlp-final" id="apoie">
        <div className="mlp-wrap mlp-final-grid">
          <div>
            <h2>Faça parte desse movimento</h2>
            <p>Voluntariado, faixa na sua casa, divulgação nas redes ou presença nos encontros — cada mão faz o Vale mais forte na Assembleia.</p>
            <div className="row">
              <a href="https://instagram.com/airton.artus" target="_blank" rel="noopener noreferrer" className="mlp-btn mlp-btn--ghost">
                Seguir no Instagram <IgIcon small />
              </a>
            </div>
          </div>
          <div className="mlp-join-form">
            {sent ? (
              <div className="mlp-join-ok">
                <div className="ok"><Check size={30} /></div>
                <h3>Recebemos seu cadastro!</h3>
                <p>Em breve a equipe entra em contato. Obrigado por caminhar junto.</p>
              </div>
            ) : (
              <form onSubmit={submitJoin}>
                <h3>Quero participar</h3>
                <p className="sub">Voluntariado, faixa na casa, eventos e muito mais.</p>
                <div className="mlp-field"><label className="sr-only" htmlFor="join-name">Seu nome</label><input id="join-name" placeholder="Seu nome" value={form.name || ''} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required /></div>
                <div className="mlp-field"><label className="sr-only" htmlFor="join-phone">WhatsApp</label><input id="join-phone" placeholder="WhatsApp (DDD + número)" value={form.phone || ''} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} required /></div>
                <div className="mlp-field"><label className="sr-only" htmlFor="join-city">Sua cidade</label><input id="join-city" placeholder="Sua cidade" value={form.cityName || ''} onChange={(e) => setForm((s) => ({ ...s, cityName: e.target.value }))} /></div>
                <div className="mlp-field">
                  <label className="sr-only" htmlFor="join-type">Como quer ajudar</label>
                  <select id="join-type" value={form.supportType} onChange={(e) => setForm((s) => ({ ...s, supportType: e.target.value }))}>
                    {options('SupportType').map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                </div>
                <button className="mlp-btn mlp-btn--primary mlp-btn--block" disabled={sending}>
                  {sending ? 'Enviando...' : 'Quero participar'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mlp-footer">
        <div className="mlp-wrap">
          <div className="mlp-foot-grid">
            <div>
              <div className="mlp-foot-brand">
                <img className="mlp-mark" src="/marca.svg" alt="" width="38" height="38" />
                <b>Airton Artus</b>
              </div>
              <div className="mlp-foot-stripe" aria-hidden="true"><i className="g" /><i className="r" /><i className="y" /></div>
              <p style={{ maxWidth: 320 }}>Saúde, trabalho e desenvolvimento para o Vale do Taquari e todo o Rio Grande do Sul.</p>
              <div className="mlp-socials">
                <a href="https://instagram.com/airton.artus" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IgIcon /></a>
              </div>
            </div>
            <div>
              <h4>Navegação</h4>
              <a href="#trajetoria">Trajetória</a>
              <a href="#bandeiras">Bandeiras</a>
              <a href="#resultados">Resultados</a>
              <a href="#propostas">Propostas</a>
            </div>
            <div>
              <h4>Contato</h4>
              <a href="mailto:contato@airtonartus.com.br">contato@airtonartus.com.br</a>
              <a href="https://instagram.com/airton.artus" target="_blank" rel="noopener noreferrer">@airton.artus</a>
              <p>Venâncio Aires · Vale do Taquari · RS</p>
            </div>
          </div>
          <div className="mlp-foot-bottom">
            © {new Date().getFullYear()} Airton Artus · Pré-candidato a Deputado Estadual · PDT · Rio Grande do Sul
            <span className="mlp-foot-legal">Material de divulgação de pré-candidatura, sem pedido de voto, nos termos da legislação eleitoral.</span>
          </div>
        </div>
      </footer>

      {/* TOASTS DE PROVA SOCIAL */}
      <div className="mlp-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={'mlp-toast' + (t.out ? ' out' : '')}>
            <div className="av" style={{ background: `linear-gradient(135deg, ${t.cor[0]}, ${t.cor[1]})` }}>{t.nome[0]}</div>
            <div className="tx"><b>{t.nome}, de {t.cidade}</b><span>{t.verbo} · {t.tempo}</span></div>
            <div className="chk"><Check size={13} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Subcomponentes ===== */
function Pillar({ ico, t, d }) {
  return (<div className="mlp-pillar mlp-reveal"><div className="ic">{ico}</div><h3>{t}</h3><p>{d}</p></div>);
}
function Resultado({ v, t, d, ico }) {
  return (
    <div className="mlp-result mlp-reveal">
      <div className="ic">{ico}</div>
      <b>{v}</b>
      <h3>{t}</h3>
      <p>{d}</p>
    </div>
  );
}
function Tl({ yr, t, d }) {
  return (<div className="mlp-tl mlp-reveal"><div className="yr">{yr}</div><h3>{t}</h3><p>{d}</p></div>);
}
function Quote({ ini, nome, loc, txt }) {
  return (
    <div className="mlp-quote mlp-reveal">
      <div className="stars" aria-hidden="true">★★★★★</div>
      <p>“{txt}”</p>
      <div className="mlp-who"><div className="av">{ini}</div><div><b>{nome}</b><span>{loc}</span></div></div>
    </div>
  );
}

/* ===== Ícones de marca (SVG inline) ===== */
function IgIcon({ small }) {
  const s = small ? 18 : 24;
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>);
}
function WaIcon({ big }) {
  const s = big ? 28 : 18;
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zM6.597 20.13c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607z" /></svg>);
}
