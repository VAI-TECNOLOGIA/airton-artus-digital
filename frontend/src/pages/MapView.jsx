import { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import {
  AlertTriangle, RotateCw, Users, MapPin, Activity,
  Radio, Pause, Layers,
} from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import api, { apiError } from '../api/client.js';
import { label } from '../config/enums.js';
import { formatPhone } from '../lib/format.js';
import 'leaflet/dist/leaflet.css';

const RS_CENTER = [-29.7, -52.0];
const RS_CENTER_LATLNG = { lat: -29.7, lng: -52.0 };
const REFRESH_MS = 30_000;

// Google Maps — usado quando VITE_GOOGLE_MAPS_API_KEY estiver setada em build/env.
// Se não estiver, usa fallback CartoDB Voyager (Leaflet).
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const USE_GOOGLE = GOOGLE_KEY.length > 20;

// Estilo minimalista pra Google Maps (remove POIs comerciais e transit,
// deixa o mapa clean pra dashboard política).
const GMAP_STYLES = [
  { featureType: 'poi.business',  stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',        elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway',   elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];
const GMAP_OPTIONS = {
  disableDefaultUI: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  zoomControl: true,
  clickableIcons: false,
  gestureHandling: 'greedy',
  styles: GMAP_STYLES,
};

// Tile CartoDB Voyager — fallback quando não há chave Google (gratuito, sem key).
// Retina-ready via {r}.
const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const LAYERS = [
  { key: 'supporters',    lbl: 'Apoiadores',     color: '#1B1D39', icon: Users },
  { key: 'banners',       lbl: 'Faixas',         color: '#BD2E2F', icon: MapPin },
  { key: 'streetActions', lbl: 'Ações de rua',   color: '#398254', icon: Activity },
];

function timeAgo(ts) {
  if (!ts) return null;
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return 'agora mesmo';
  if (s < 60) return `há ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}min`;
  return `há ${Math.floor(m / 60)}h`;
}

export default function MapView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [live, setLive] = useState(true);
  const [visible, setVisible] = useState({
    supporters: true, banners: true, streetActions: true,
  });
  // força re-render pra atualizar timeAgo(...) sem outra fetch
  const [tick, setTick] = useState(0);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    if (!silent) setError(null);
    try {
      const { data } = await api.get('/dashboard/map');
      setData(data);
      setLastUpdate(Date.now());
    } catch (e) {
      if (!silent) setError(apiError(e, 'Não foi possível carregar as camadas do mapa.'));
    } finally {
      if (silent) setRefreshing(false); else setLoading(false);
    }
  }, []);

  // primeira carga
  useEffect(() => { load(); }, [load]);

  // polling ao vivo
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load(true);
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [live, load]);

  // tick pra "há Ns" atualizar
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);
  const _tick = tick; // força recomputo do useMemo a cada 5s

  const counts = useMemo(() => {
    const c = {};
    for (const l of LAYERS) c[l.key] = data?.[l.key]?.length || 0;
    c.total = c.supporters + c.banners + c.streetActions;
    return c;
  }, [data]);

  const anyContent = data && counts.total > 0;

  return (
    <Layout
      title="Mapa político"
      subtitle="Apoiadores, faixas e ações georreferenciadas em tempo real"
    >
      <div className="map-shell">
        {/* SIDEBAR */}
        <aside className="map-side">
          <div className="live-badge" data-live={live}>
            <span className="dot" />
            {live ? 'AO VIVO' : 'PAUSADO'}
            <button
              className="live-toggle"
              onClick={() => setLive((v) => !v)}
              aria-label={live ? 'Pausar atualização automática' : 'Ativar atualização automática'}
            >
              {live ? <><Pause size={11} /> pausar</> : <><Radio size={11} /> ativar</>}
            </button>
          </div>

          <div className="side-stat">
            <div className="side-stat-num">
              {loading ? '—' : counts.total.toLocaleString('pt-BR')}
            </div>
            <div className="side-stat-label">Pontos no mapa</div>
            {refreshing ? (
              <div className="side-stat-sub">
                <RotateCw size={11} className="spin" /> atualizando…
              </div>
            ) : lastUpdate ? (
              <div className="side-stat-sub">
                atualizado {timeAgo(lastUpdate)}
              </div>
            ) : null}
          </div>

          <div className="layer-list">
            <div className="layer-list-title">
              <Layers size={11} /> Camadas
            </div>
            {LAYERS.map((l) => (
              <label
                key={l.key}
                className={`layer-item ${visible[l.key] ? '' : 'off'}`}
                style={{ '--c': l.color }}
              >
                <input
                  type="checkbox"
                  checked={visible[l.key]}
                  disabled={loading || !!error}
                  onChange={(e) =>
                    setVisible((v) => ({ ...v, [l.key]: e.target.checked }))
                  }
                />
                <div className="layer-dot"><l.icon size={12} /></div>
                <div className="layer-name">{l.lbl}</div>
                <div className="layer-count">
                  {loading ? '…' : counts[l.key].toLocaleString('pt-BR')}
                </div>
              </label>
            ))}
          </div>

          <button
            className="btn-refresh"
            onClick={() => load(false)}
            disabled={loading || refreshing}
          >
            <RotateCw size={13} className={loading || refreshing ? 'spin' : ''} />
            Recarregar
          </button>
        </aside>

        {/* MAP */}
        {error ? (
          <div className="map-wrap map-center">
            <div className="empty">
              <div className="empty-icon"><AlertTriangle size={26} /></div>
              <h4>{error}</h4>
              <button className="btn btn-primary btn-sm mt-16" onClick={() => load(false)}>
                <RotateCw size={14} /> Tentar novamente
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="map-wrap map-center">
            <div className="center-box">
              <div className="spinner" />
              <span className="muted">Carregando camadas do mapa…</span>
            </div>
          </div>
        ) : USE_GOOGLE ? (
          <GoogleCanvas data={data} visible={visible} refreshing={refreshing} hasContent={anyContent} />
        ) : (
          <LeafletCanvas data={data} visible={visible} refreshing={refreshing} hasContent={anyContent} />
        )}
      </div>
    </Layout>
  );
}

function Detail({ layer, p }) {
  if (layer === 'supporters') {
    return (
      <div className="map-popup">
        <div className="map-popup-title">{p.name}</div>
        <div className="map-popup-badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
          {label('SupportType', p.supportType)}
        </div>
        <div className="map-popup-line">{formatPhone(p.phone)}</div>
        <div className="map-popup-sub">
          {[p.neighborhood, p.cityName].filter(Boolean).join(' · ')}
        </div>
      </div>
    );
  }
  if (layer === 'banners') {
    return (
      <div className="map-popup">
        <div className="map-popup-title">Faixa — {p.responsibleName || '—'}</div>
        <div className="map-popup-badge" style={{ background: '#E4ECF7', color: '#003E9D' }}>
          {label('BannerStatus', p.status)}
        </div>
        <div className="map-popup-sub">
          {p.address || [p.neighborhood, p.cityName].filter(Boolean).join(' · ')}
        </div>
      </div>
    );
  }
  return (
    <div className="map-popup">
      <div className="map-popup-title">{p.title}</div>
      <div className="map-popup-badge" style={{ background: '#dcfce7', color: '#166534' }}>
        {label('StreetActionType', p.type)}
      </div>
      <div className="map-popup-sub">{p.neighborhood}</div>
    </div>
  );
}

/* Overlay comum: indicador de refresh + empty state — mesmo visual em ambos os canvas. */
function CanvasOverlay({ refreshing, hasContent }) {
  return (
    <>
      {refreshing && (
        <div className="map-refresh-indicator">
          <RotateCw size={11} className="spin" />
          Atualizando
        </div>
      )}
      {!hasContent && (
        <div className="map-empty-overlay">
          <div className="map-empty-card">
            <div className="empty-icon"><MapPin size={26} /></div>
            <h4>Nenhum ponto ainda no mapa</h4>
            <p className="muted">
              Cadastros de apoiadores, faixas e ações vão aparecer aqui automaticamente.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/* Canvas Leaflet (fallback, sempre disponível — sem key). */
function LeafletCanvas({ data, visible, refreshing, hasContent }) {
  return (
    <div className="map-wrap map-container-wrap">
      <MapContainer
        center={RS_CENTER}
        zoom={7}
        scrollWheelZoom
        zoomControl={false}
        style={{ height: '100%', background: '#eaf1f7' }}
      >
        <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
        <ZoomControl position="topright" />
        {LAYERS.map(
          (l) =>
            visible[l.key] &&
            (data[l.key] || []).map((p) => (
              <CircleMarker
                key={`${l.key}-${p.id}`}
                center={[p.lat, p.lng]}
                radius={l.key === 'supporters' ? 6 : 8}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: l.color,
                  fillOpacity: 0.92,
                  weight: 2,
                }}
              >
                <Popup>
                  <Detail layer={l.key} p={p} />
                </Popup>
              </CircleMarker>
            ))
        )}
      </MapContainer>
      <CanvasOverlay refreshing={refreshing} hasContent={hasContent} />
    </div>
  );
}

/* Canvas Google Maps — ativa quando VITE_GOOGLE_MAPS_API_KEY está setada. */
function GoogleCanvas({ data, visible, refreshing, hasContent }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'mbd-google-map',
    googleMapsApiKey: GOOGLE_KEY,
  });
  const [selected, setSelected] = useState(null);

  if (loadError) {
    return (
      <div className="map-wrap map-center">
        <div className="empty">
          <div className="empty-icon"><AlertTriangle size={26} /></div>
          <h4>Não foi possível carregar o Google Maps</h4>
          <p className="muted">
            Verifique se a chave <code>VITE_GOOGLE_MAPS_API_KEY</code> é válida,
            está ativa e tem a API “Maps JavaScript” habilitada.
          </p>
        </div>
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="map-wrap map-center">
        <div className="center-box">
          <div className="spinner" />
          <span className="muted">Carregando Google Maps…</span>
        </div>
      </div>
    );
  }

  const iconFor = (color, scale) => ({
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 0.92,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale,
  });

  return (
    <div className="map-wrap map-container-wrap">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={RS_CENTER_LATLNG}
        zoom={7}
        options={GMAP_OPTIONS}
      >
        {LAYERS.map(
          (l) =>
            visible[l.key] &&
            (data[l.key] || []).map((p) => (
              <Marker
                key={`${l.key}-${p.id}`}
                position={{ lat: p.lat, lng: p.lng }}
                icon={iconFor(l.color, l.key === 'supporters' ? 6 : 8)}
                onClick={() => setSelected({ layer: l.key, p })}
              />
            ))
        )}
        {selected && (
          <InfoWindow
            position={{ lat: selected.p.lat, lng: selected.p.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <Detail layer={selected.layer} p={selected.p} />
          </InfoWindow>
        )}
      </GoogleMap>
      <CanvasOverlay refreshing={refreshing} hasContent={hasContent} />
    </div>
  );
}
