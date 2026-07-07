import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, MapPin, Flag } from 'lucide-react';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { options } from '../config/enums.js';
import '../styles/landing.css';

/* ===== Dados para a prova social (escopo de módulo: não recriar a cada render) ===== */
const NOMES = [
  'Mateus','Lucas','Gabriel','Pedro','João','Felipe','Rafael','Bruno','Thiago','Vinícius','Eduardo','Gustavo',
  'Leonardo','Rodrigo','Marcelo','Fernando','Ricardo','André','Diego','Henrique','Carlos','Paulo','Daniel','Fábio',
  'Alexandre','Júlio','César','Renato','Maurício','Anderson','Cristiano','Émerson','Jonas','Augusto','Otávio','Caio',
  'Vitor','Igor','Murilo','Arthur','Bernardo','Heitor','Davi','Enzo','Nícolas','Samuel','Téo','Miguel','Lorenzo',
  'Cleber','Volnei','Ademar','Nelson','Valdir','Sérgio','Jair','Ivo','Délcio','Ari','Hélio','José','Antônio',
  'Francisco','Luiz','Mário','Adilson','Gilberto','Rogério','Sandro','Márcio','Joel','Everton','Maicon','Wagner','Cláudio',
  'Ana','Maria','Júlia','Beatriz','Larissa','Fernanda','Camila','Bruna','Carolina','Letícia','Amanda','Gabriela',
  'Mariana','Patrícia','Aline','Vanessa','Daniela','Juliana','Renata','Tatiane','Cristiane','Sabrina','Débora','Priscila',
  'Eduarda','Manuela','Helena','Valentina','Laura','Isabela','Sofia','Alice','Lívia','Cecília','Antônia','Rafaela',
  'Bianca','Carla','Adriana','Simone','Elaine','Roberta','Michele','Andréa','Luana','Natália','Jéssica','Franciele',
  'Graziela','Taís','Rosane','Marlene','Salete','Ivone','Neusa','Terezinha','Verônica','Joana','Marta',
];
const CIDADES = [
  'Florianópolis','Joinville','Blumenau','São José','Chapecó','Itajaí','Criciúma','Jaraguá do Sul','Lages',
  'Palhoça','Balneário Camboriú','Brusque','Tubarão','Caçador','Concórdia','Camboriú','Navegantes','Rio do Sul',
  'Araranguá','Biguaçu','Gaspar','Indaial','Itapema','Tijucas','São Bento do Sul','Mafra','Canoinhas','Videira',
  'Xanxerê','Imbituba','Içara','Sombrio','Braço do Norte','Orleans','Urussanga','Laguna','Garopaba','Imaruí',
  'Santo Amaro da Imperatriz','Governador Celso Ramos','Porto Belo','Bombinhas','Penha','Barra Velha',
  'São Francisco do Sul','Araquari','Guaramirim','Massaranduba','Corupá','Schroeder','Pomerode','Timbó','Rodeio',
  'Ibirama','Presidente Getúlio','Taió','Ituporanga','Otacílio Costa','Correia Pinto','São Joaquim','Urubici',
  'Bom Retiro','Curitibanos','Fraiburgo','Campos Novos','Joaçaba','Herval d’Oeste','Capinzal','Seara','Xaxim',
  'São Miguel do Oeste','Maravilha','Pinhalzinho','São Lourenço do Oeste','Palmitos','Mondaí','Dionísio Cerqueira',
  'Abelardo Luz','Água Doce','Ponte Serrada','Balneário Piçarras','Ilhota','Gravatal','Sangão','Morro da Fumaça',
  'Nova Veneza','Siderópolis','Forquilhinha','Meleiro','Turvo','Praia Grande','Jaguaruna','Treze Tílias',
];
const VERBOS = ['virou apoiador!','entrou na campanha!','agora apoia a campanha!','se juntou ao movimento!','virou voluntário!'];
const TEMPOS = ['agora mesmo','há poucos segundos','há instantes'];
const CORES = [['#1f6feb','#0a2540'],['#d62828','#9e1818'],['#1a9e54','#0d6b39'],['#7b2ff7','#3a1d8a'],['#f59e0b','#b45309'],['#0ea5e9','#075985']];

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

  // imã — Plano de Governo
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
        cityName: 'Florianópolis',
        supportType: 'MATERIAL_DIGITAL',
      });
      setLeadSent(true);
      toast.success('Plano de Governo a caminho! 📩');
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
      await api.post('/public/join', { ...form, cityName: form.cityName || 'Florianópolis' });
      setSent(true);
      toast.success('Cadastro recebido! 💪');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSending(false);
    }
  }

  const fmt = (n) => (n == null ? '—' : n);

  return (
    <div className="mlp">
      {/* HEADER */}
      <header className={'mlp-header' + (scrolled ? ' scrolled' : '')}>
        <div className="mlp-wrap mlp-bar">
          <a href="#topo" className="mlp-brand">
            <img className="mlp-mark" src="/partido-mark.svg" alt="Partido Teste" width="42" height="42" />
            <span className="wm"><b>Candidato Teste</b><small>Vereador · Partido Teste</small></span>
          </a>
          <nav className="mlp-menu">
            <a className="mlp-navlink" href="#bandeiras">Bandeiras</a>
            <a className="mlp-navlink" href="#frentes">Frentes</a>
            <a className="mlp-navlink" href="#trajetoria">Trajetória</a>
            <a className="mlp-navlink" href="#redes">Redes</a>
            <Link to="/login" className="mlp-enter">Entrar no sistema</Link>
            <a href="#apoie" className="mlp-btn mlp-btn--primary">Some-se</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="mlp-hero" id="topo">
        <div className="mlp-wrap mlp-hero-grid">
          <div>
            <span className="mlp-eyebrow"><Flag size={13} /> Vereador · Partido Teste · Santa Catarina</span>
            <h1>Juntos por você,<br /><span className="accent">pela sua&nbsp;cidade.</span></h1>
            <p className="mlp-lead">
              Trabalho e idealismo por uma cidade mais justa. Política de proximidade,
              com ética e coerência — feita com a comunidade, para a comunidade.
            </p>
            <div className="mlp-cta">
              <a href="#apoie" className="mlp-btn mlp-btn--primary">Quero apoiar a campanha <ArrowRight size={18} /></a>
              <a href="#bandeiras" className="mlp-btn mlp-btn--ghost">Conhecer as bandeiras</a>
            </div>
            <div className="mlp-trust">
              <span className="mlp-pill"><b>+000</b> apoiadores</span>
              <span className="mlp-pill"><b>00</b> bairros</span>
              <span className="mlp-pill">Campanha de demonstração</span>
            </div>
          </div>

          <div className="mlp-portrait">
            <div className="ring" />
            <img src="/candidato.jpg" alt="Candidato Teste" />
            <div className="mlp-chip c1">
              <div className="ic"><MapPin size={20} /></div>
              <div><small>Atuação</small><b>Florianópolis</b></div>
            </div>
            <div className="mlp-chip c2">
              <div className="ic"><Check size={20} /></div>
              <div><small>Cargo</small><b>Vereador</b></div>
            </div>
          </div>
        </div>
        <div className="mlp-scroll"><div className="mlp-mouse" />role para conhecer</div>
      </section>

      {/* MARQUEE */}
      <div className="mlp-marquee">
        <div className="mlp-track">
          <span>Saúde <i>•</i> Educação <i>•</i> Guaíba Despoluído <i>•</i> Moradia Popular <i>•</i> Cooperativismo <i>•</i> Esporte <i>•</i> Cidadania <i>•</i></span>
          <span>Saúde <i>•</i> Educação <i>•</i> Guaíba Despoluído <i>•</i> Moradia Popular <i>•</i> Cooperativismo <i>•</i> Esporte <i>•</i> Cidadania <i>•</i></span>
        </div>
      </div>

      {/* STATS (ao vivo) */}
      <section className="mlp-block">
        <div className="mlp-wrap">
          <div className="mlp-stats">
            <div className="mlp-stat mlp-reveal"><b>{fmt(stats?.supporters)}</b><span>Apoiadores</span></div>
            <div className="mlp-stat mlp-reveal"><b>{fmt(stats?.volunteers)}</b><span>Voluntários</span></div>
            <div className="mlp-stat mlp-reveal"><b>{fmt(stats?.actions)}</b><span>Ações de rua</span></div>
            <div className="mlp-stat mlp-reveal"><b>{fmt(stats?.banners)}</b><span>Faixas nas casas</span></div>
          </div>
        </div>
      </section>

      {/* BANDEIRAS */}
      <section className="mlp-block mlp-soft" id="bandeiras">
        <div className="mlp-wrap">
          <div className="mlp-head mlp-reveal">
            <span className="mlp-eyebrow">O que defendemos</span>
            <h2>Bandeiras que mudam o seu dia a dia</h2>
            <p>Causas trabalhadas de forma contínua — com metas claras e prestação de contas para cada bairro da cidade.</p>
          </div>
          <div className="mlp-pillars">
            <Pillar ico="🏥" t="Saúde integrativa" d="Mais acesso, agilidade no atendimento e apoio às práticas integrativas e à doação de órgãos e sangue." />
            <Pillar ico="🏠" t="Moradia digna" d="Apoio à moradia popular e à regularização fundiária, dando segurança e dignidade às famílias." />
            <Pillar ico="🌊" t="Guaíba despoluído" d="Despoluição das águas do Guaíba e cuidado ambiental para uma cidade mais limpa e saudável." />
            <Pillar ico="🤝" t="Cooperativismo" d="Incentivo ao cooperativismo e ao pequeno empreendedor como motor de emprego e renda." />
            <Pillar ico="📚" t="Educação de futuro" d="Educação de qualidade, segurança escolar e inclusão digital para preparar as novas gerações." />
            <Pillar ico="🏅" t="Esporte e cidadania" d="Esporte, lazer e cultura como ferramentas de inclusão e transformação social nos bairros." />
          </div>
        </div>
      </section>

      {/* FRENTES PARLAMENTARES */}
      <section className="mlp-block" id="frentes">
        <div className="mlp-wrap">
          <div className="mlp-head mlp-reveal">
            <span className="mlp-eyebrow">Liderança comprovada</span>
            <h2>Frentes parlamentares que presido</h2>
            <p>À frente de causas estruturantes para a sua cidade, articulando soluções com a sociedade civil.</p>
          </div>
          <div className="mlp-frentes">
            <Frente n="01" t="Despoluição das Águas do Guaíba" d="Pela recuperação e saúde do nosso cartão-postal." />
            <Frente n="02" t="Apoio à Moradia Popular e Regularização Fundiária" d="Segurança jurídica e dignidade para as famílias." />
            <Frente n="03" t="Apoio ao Cooperativismo — FRENCOOP" d="Fortalecimento da economia cooperativa local." />
            <Frente n="04" t="Práticas Integrativas em Saúde" d="Ampliação do cuidado e do bem-estar no SUS municipal." />
            <Frente n="05" t="Incentivo à Doação de Órgãos e Sangue" d="Salvando vidas com conscientização e políticas públicas." />
            <Frente n="06" t="Mercado Imobiliário" d="Desenvolvimento urbano responsável e geração de emprego." />
          </div>
        </div>
      </section>

      {/* IMÃ — Plano de Governo */}
      <section className="mlp-block mlp-soft" id="plano">
        <div className="mlp-wrap">
          <div className="mlp-magnet mlp-reveal">
            <div className="mlp-magnet-inner">
              <div>
                <span className="mlp-eyebrow">Material exclusivo · Grátis</span>
                <h2>Baixe o Plano de Governo completo</h2>
                <p>Receba no seu WhatsApp/e-mail o documento com todas as propostas, metas e cronograma — e seja o primeiro a saber das novidades da campanha.</p>
                <ul>
                  <li><Check size={22} /> Bandeiras detalhadas por área</li>
                  <li><Check size={22} /> Metas com prazos e indicadores</li>
                  <li><Check size={22} /> Agenda de eventos perto de você</li>
                </ul>
              </div>
              <div className="mlp-form">
                {leadSent ? (
                  <div className="mlp-ok">
                    <Check size={54} />
                    <h3>Recebido! 🎉</h3>
                    <p>Em instantes você recebe o material. Obrigado por caminhar conosco!</p>
                  </div>
                ) : (
                  <form onSubmit={submitLead}>
                    <h3>Receba agora, é grátis</h3>
                    <p className="sub">Preencha e enviamos o material.</p>
                    <div className="mlp-field"><input placeholder="Seu nome" value={lead.name} onChange={(e) => setLead((s) => ({ ...s, name: e.target.value }))} required /></div>
                    <div className="mlp-field"><input placeholder="WhatsApp (DDD + número)" value={lead.phone} onChange={(e) => setLead((s) => ({ ...s, phone: e.target.value }))} required /></div>
                    <div className="mlp-field"><input type="email" placeholder="Seu e-mail (opcional)" value={lead.email} onChange={(e) => setLead((s) => ({ ...s, email: e.target.value }))} /></div>
                    <button className="mlp-btn mlp-btn--primary mlp-btn--block" disabled={leadSending}>
                      {leadSending ? 'Enviando...' : 'Quero o Plano de Governo'}
                    </button>
                    <p className="privacy">🔒 Seus dados estão seguros. Sem spam.</p>
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
          <blockquote>Política se faz <span className="hl">com</span> as pessoas, não <span className="hl">pelas</span> pessoas. Trabalho e idealismo, com ética e coerência — é caminhando junto que a sua cidade muda.</blockquote>
          <div className="mlp-by">
            <img src="/candidato.jpg" alt="Candidato Teste" />
            <div style={{ textAlign: 'left' }}><b>Candidato Teste</b><span>Vereador · Sua Cidade</span></div>
          </div>
        </div>
      </section>

      {/* TRAJETÓRIA */}
      <section className="mlp-block mlp-soft" id="trajetoria">
        <div className="mlp-wrap">
          <div className="mlp-head mlp-reveal">
            <span className="mlp-eyebrow">Quem é o candidato</span>
            <h2>Uma trajetória de resultados</h2>
            <p>Espaço para a biografia do candidato — formação, atuação e compromissos. Conteúdo ilustrativo de demonstração.</p>
          </div>
          <div className="mlp-timeline">
            <Tl yr="Ano 1" t="Primeiro cargo público" d="Descrição da primeira grande atuação — conteúdo de demonstração." />
            <Tl yr="Ano 2" t="Segunda função relevante" d="Resumo da atuação nesta etapa — conteúdo de demonstração." />
            <Tl yr="Ano 3" t="Marco importante" d="Principal conquista deste período — conteúdo de demonstração." />
            <Tl yr="Hoje" t="Mandato atual" d="Projetos apresentados e frentes de atuação — conteúdo de demonstração." />
          </div>
        </div>
      </section>

      {/* REDES SOCIAIS */}
      <section className="mlp-block mlp-social" id="redes">
        <div className="mlp-wrap">
          <div className="mlp-head mlp-reveal">
            <span className="mlp-eyebrow">Vem com a gente</span>
            <h2>Acompanhe nas redes</h2>
            <p>Bastidores, conquistas e a agenda da campanha em primeira mão. Siga, comente e compartilhe — sua voz fortalece o movimento.</p>
          </div>
          <div className="mlp-soc-grid">
            <a href="https://instagram.com/candidatodemo" target="_blank" rel="noopener noreferrer" className="mlp-soc ig mlp-reveal">
              <div className="top">
                <div className="ic"><IgIcon /></div>
                <span className="live"><span className="dot" /> Ao vivo</span>
              </div>
              <div>
                <h3>Instagram</h3>
                <div className="handle">@candidatodemo</div>
                <span className="go">Seguir <ArrowRight size={16} /></span>
              </div>
              <span className="bgnum">IG</span>
            </a>

            <a href="https://facebook.com/candidatodemo" target="_blank" rel="noopener noreferrer" className="mlp-soc fb mlp-reveal">
              <div className="top">
                <div className="ic"><FbIcon /></div>
                <span className="live"><span className="dot" /> Online</span>
              </div>
              <div>
                <h3>Facebook</h3>
                <div className="handle">/candidatodemo</div>
                <span className="go">Curtir página <ArrowRight size={16} /></span>
              </div>
              <span className="bgnum">f</span>
            </a>

            <a href="https://youtube.com/channel/UCrLCED_PdfgOHyvvlDseC1w" target="_blank" rel="noopener noreferrer" className="mlp-soc yt mlp-reveal">
              <div className="top">
                <div className="ic"><YtIcon /></div>
                <span className="live"><span className="dot" /> Inscreva-se</span>
              </div>
              <div>
                <h3>YouTube</h3>
                <div className="handle">Canal Candidato Teste</div>
                <span className="go">Inscrever-se <ArrowRight size={16} /></span>
              </div>
              <span className="bgnum">▶</span>
            </a>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="mlp-block">
        <div className="mlp-wrap">
          <div className="mlp-head mlp-reveal">
            <span className="mlp-eyebrow">Vozes da cidade</span>
            <h2>Quem caminha junto</h2>
          </div>
          <div className="mlp-cards">
            <Quote ini="RM" nome="Rosa Martins" loc="Moradora · Restinga" txt="Finalmente alguém que escuta o bairro antes de prometer. O candidato esteve aqui e ouviu cada morador." />
            <Quote ini="JS" nome="João Silveira" loc="Comerciante · Centro" txt="Trabalho sério, de proximidade. É o tipo de representante que a cidade precisa na Câmara." />
            <Quote ini="AP" nome="Ana Paula" loc="Professora · Partenon" txt="Sinto que minha voz importa. A campanha é da comunidade, não só de um nome." />
          </div>
          <p className="mlp-note">* Depoimentos ilustrativos — substituir por depoimentos reais autorizados.</p>
        </div>
      </section>

      {/* CTA FINAL + PARTICIPAR */}
      <section className="mlp-block mlp-final" id="apoie">
        <div className="mlp-wrap mlp-final-grid">
          <div>
            <h2>Faça parte dessa mudança</h2>
            <p>Sua voz, seu voto e suas mãos constroem a cidade que a gente quer. Some-se à campanha hoje.</p>
            <div className="row">
              <a href="https://wa.me/5551993069837" target="_blank" rel="noopener noreferrer" className="mlp-btn mlp-btn--ghost" style={{ borderColor: 'rgba(255,255,255,.7)' }}>
                Falar no WhatsApp <WaIcon />
              </a>
            </div>
          </div>
          <div className="mlp-join-form">
            {sent ? (
              <div className="mlp-join-ok">
                <div className="ok"><Check size={30} /></div>
                <h3>Recebemos seu cadastro!</h3>
                <p>Em breve entraremos em contato. Obrigado por apoiar. 🙌</p>
              </div>
            ) : (
              <form onSubmit={submitJoin}>
                <h3>Quero participar</h3>
                <p className="sub">Voluntário, faixa na casa, eventos e muito mais.</p>
                <div className="mlp-field"><input placeholder="Seu nome" value={form.name || ''} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required /></div>
                <div className="mlp-field"><input placeholder="WhatsApp (DDD + número)" value={form.phone || ''} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} required /></div>
                <div className="mlp-field"><input placeholder="Seu bairro" value={form.neighborhood || ''} onChange={(e) => setForm((s) => ({ ...s, neighborhood: e.target.value }))} /></div>
                <div className="mlp-field">
                  <select value={form.supportType} onChange={(e) => setForm((s) => ({ ...s, supportType: e.target.value }))}>
                    {options('SupportType').map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                </div>
                <button className="mlp-btn mlp-btn--primary mlp-btn--block" disabled={sending}>
                  {sending ? 'Enviando...' : 'Quero apoiar a campanha'}
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
              <div className="mlp-foot-brand"><img className="mlp-mark" src="/partido-mark.svg" alt="Partido Teste" width="34" height="34" /><b>Candidato Teste</b></div>
              <p style={{ maxWidth: 320 }}>Juntos por você, pela sua cidade. Trabalho e idealismo — uma campanha construída com a comunidade.</p>
              <div className="mlp-socials">
                <a href="https://instagram.com/candidatodemo" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IgIcon /></a>
                <a href="https://facebook.com/candidatodemo" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FbIcon /></a>
                <a href="https://youtube.com/channel/UCrLCED_PdfgOHyvvlDseC1w" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><YtIcon /></a>
              </div>
            </div>
            <div>
              <h4>Navegação</h4>
              <a href="#bandeiras">Bandeiras</a>
              <a href="#frentes">Frentes parlamentares</a>
              <a href="#trajetoria">Trajetória</a>
              <a href="#plano">Plano de Governo</a>
            </div>
            <div>
              <h4>Contato</h4>
              <a href="mailto:contato@candidatodemo.com.br">contato@candidatodemo.com.br</a>
              <a href="https://wa.me/5551993069837" target="_blank" rel="noopener noreferrer">WhatsApp (51) 99306-9837</a>
              <a href="https://candidatodemo.com.br" target="_blank" rel="noopener noreferrer">candidatodemo.com.br</a>
              <p>Santa Catarina</p>
            </div>
          </div>
          <div className="mlp-foot-bottom">
            © {new Date().getFullYear()} Candidato Teste · Vereador · Partido Teste · Santa Catarina — Dados públicos; conteúdo de campanha ilustrativo.
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
function Frente({ n, t, d }) {
  return (<div className="mlp-frente mlp-reveal"><div className="n">{n}</div><div><h3>{t}</h3><p>{d}</p></div></div>);
}
function Tl({ yr, t, d }) {
  return (<div className="mlp-tl mlp-reveal"><div className="yr">{yr}</div><h3>{t}</h3><p>{d}</p></div>);
}
function Quote({ ini, nome, loc, txt }) {
  return (
    <div className="mlp-quote mlp-reveal">
      <div className="stars">★★★★★</div>
      <p>“{txt}”</p>
      <div className="mlp-who"><div className="av">{ini}</div><div><b>{nome}</b><span>{loc}</span></div></div>
    </div>
  );
}

/* ===== Ícones de marca (SVG inline) ===== */
function IgIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>);
}
function FbIcon() {
  return (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>);
}
function YtIcon() {
  return (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.5-.46-5.17a3 3 0 00-2.12-2.12C18.75 4.25 12 4.25 12 4.25s-6.75 0-8.42.46A3 3 0 001.46 6.83C1 8.5 1 12 1 12s0 3.5.46 5.17a3 3 0 002.12 2.12c1.67.46 8.42.46 8.42.46s6.75 0 8.42-.46a3 3 0 002.12-2.12C23 15.5 23 12 23 12zM10 15.5v-7l6 3.5z" /></svg>);
}
function WaIcon() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zM6.597 20.13c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607z" /></svg>);
}
