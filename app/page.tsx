import { calculateValue, classifyOpportunity } from '../lib/value';

const markets = ['Remates', 'Al arco', 'Atajadas', 'Goles', 'Corners', 'Tarjetas', 'Handicap', 'BTTS'];

export default function Home() {
  const configured = Boolean(process.env.FOOTBALL_API_KEY);
  const oddsConfigured = Boolean(process.env.ODDS_API_KEY);
  const example = calculateValue(0.64, 1.87);
  const status = classifyOpportunity(example.edge, false);

  return (
    <main>
      <header>
        <div><span className="pulse" /> RADAR 365</div>
        <span className="live">SCANNER</span>
      </header>

      <section className="hero">
        <p className="eyebrow">HOY</p>
        <h1>Oportunidades de fútbol</h1>
        <p className="muted">Probabilidad estimada → cuota justa → valor. Sin inventar cuotas.</p>
      </section>

      <section className="health">
        <div><b>Datos fútbol</b><span className={configured ? 'ok' : 'warn'}>{configured ? 'Conectado' : 'Falta API'}</span></div>
        <div><b>Cuotas</b><span className={oddsConfigured ? 'ok' : 'warn'}>{oddsConfigured ? 'Conectado' : 'Falta API'}</span></div>
        <div><b>Motor</b><span className="ok">Activo</span></div>
      </section>

      <nav>{markets.map(m => <span key={m}>{m}</span>)}</nav>

      <section className="empty">
        <div className="radar"><i /><i /><i /></div>
        <h2>Scanner preparado</h2>
        <p>Radar 365 no va a mostrar picks ficticios. Cuando los proveedores estén conectados, acá aparecerán solamente señales que superen los filtros de valor y confianza.</p>
      </section>

      <section className="logic">
        <p className="eyebrow">MOTOR DE VALOR · TEST INTERNO</p>
        <div className="metrics">
          <div><small>Modelo</small><strong>64%</strong></div>
          <div><small>Cuota justa</small><strong>{example.fairOdds.toFixed(2)}</strong></div>
          <div><small>Cuota mercado</small><strong>1.87</strong></div>
          <div><small>Edge</small><strong>+{(example.edge * 100).toFixed(1)}%</strong></div>
        </div>
        <span className={`badge ${status.toLowerCase()}`}>{status}</span>
      </section>

      <footer>Radar 365 analiza; vos decidís y ejecutás cualquier apuesta.</footer>
    </main>
  );
}
