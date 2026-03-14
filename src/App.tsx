import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  ArrowLeft, 
  Save,
  Zap,
  Lock,
  Activity,
  LocateFixed,
  Loader2,
  Users,
  Plus,
  Trash2,
  PenTool,
  X,
  Eraser,
  Sparkles,
  MessageSquareWarning,
  Archive,
  FileText,
  Printer,
  LogIn,
  UserPlus,
  LogOut
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- GEMINI API INTEGRATION ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const callGeminiAPI = async (prompt: string, expectJson = false, schema: any = null) => {
  try {
    const config: any = {
      systemInstruction: "Du er en norsk elektroinstallatør og ekspert på elsikkerhet, FSE (Forskrift om sikkerhet ved elektriske anlegg) og FEL. Du gir profesjonelle, korte og presise faglige råd.",
    };

    if (expectJson && schema) {
      config.responseMimeType = "application/json";
      config.responseSchema = schema;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-09-2025",
      contents: prompt,
      config
    });

    const text = response.text;
    if (!text) throw new Error("Tomt svar fra Gemini");
    
    return expectJson ? JSON.parse(text) : text;
  } catch (error) {
    console.error("Gemini API feilet:", error);
    throw error;
  }
};

// --- HELPER SCRIPT LOADER FOR PDF ---
const loadScript = (src: string) => {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

// --- SIGNATURE COMPONENT ---
const SignatureModal = ({ onClose, onSave, title }: { onClose: () => void, onSave: (data: string) => void, title: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: any) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Signatur: {title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 bg-slate-100 flex justify-center">
          <canvas
            ref={canvasRef}
            width={350}
            height={200}
            className="bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="p-4 bg-white border-t border-slate-200 flex justify-between">
          <button 
            onClick={clearCanvas}
            className="flex items-center px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >
            <Eraser className="w-4 h-4 mr-2" /> Visk ut
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md shadow-blue-500/20 transition-all"
          >
            Lagre signatur
          </button>
        </div>
      </div>
    </div>
  );
};

const getInitialFormData = () => ({
  prosjektNavn: '',
  jobbNavn: '',
  lokasjon: '',
  dato: new Date().toISOString().split('T')[0],
  ansvarligLFS: '',
  lfsSignaturData: null as string | null,
  deltakere: [] as { navn: string, signaturData: string | null }[],
  arbeidsmetode: '',
  farer: {
    strømgjennomgang: false,
    lysbue: false,
    fall: false,
    klemfare: false,
    asbest: false,
    dårligLys: false,
    trafikk: false,
    skjulteKabler: false,
  } as Record<string, boolean>,
  tiltak: {
    frakoblet: false,
    låstOgMerket: false,
    spenningsprøvd: false,
    kortsluttetOgJordet: false,
    avskjerming: false,
    verneutstyr: false,
  } as Record<string, boolean>,
  kommentarer: '',
  sikkerhetsbrief: ''
});

// --- PRINTABLE DOCUMENT COMPONENT ---
const PrintDocument = ({ data }: { data: any }) => {
  if (!data) return null;

  const farerListe = Object.entries(data.farer || {}).filter(([_, v]) => v).map(([k]) => k);
  const tiltakListe = Object.entries(data.tiltak || {}).filter(([_, v]) => v).map(([k]) => k);

  const labels: Record<string, string> = {
    strømgjennomgang: 'Strømgjennomgang',
    lysbue: 'Kortslutning / Lysbue',
    fall: 'Arbeid i høyden / Fall',
    klemfare: 'Klemfare / Tunge løft',
    asbest: 'Asbest / Farlige stoffer',
    dårligLys: 'Dårlig belysning / Sikt',
    trafikk: 'Trafikkfare / Påkjørsel',
    skjulteKabler: 'Gravearbeid / Skjulte kabler',
    frakoblet: 'Frakoblet anleggsdel',
    låstOgMerket: 'Sikret mot innkobling (Låst og merket)',
    spenningsprøvd: 'Spenningsløshet konstatert (Målt)',
    kortsluttetOgJordet: 'Kortsluttet og jordet',
    avskjerming: 'Avskjerming mot spenningsførende deler',
    verneutstyr: 'Bruk av personlig verneutstyr'
  };

  return (
    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
      <style>{`
        .pdf-container { 
          color: #0f172a !important; 
          background-color: #ffffff !important;
          font-family: 'Helvetica', 'Arial', sans-serif !important;
          width: 794px !important; /* A4 width at 96 DPI */
          padding: 50px !important;
          font-size: 13px !important;
          line-height: 1.5 !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          border: 1px solid #e2e8f0 !important;
        }
        .pdf-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 25px; }
        .pdf-title { text-transform: uppercase; font-weight: 900; font-size: 28px; letter-spacing: -0.02em; color: #0f172a; margin: 0; line-height: 1; }
        .pdf-meta { display: flex; align-items: center; gap: 12px; color: #64748b; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 8px; }
        .pdf-dot { width: 4px; height: 4px; background-color: #cbd5e1; border-radius: 9999px; }
        .pdf-date-box { background-color: #f1f5f9; border: 1px solid #e2e8f0; padding: 10px 15px; border-radius: 10px; text-align: right; min-width: 120px; }
        .pdf-date-label { text-transform: uppercase; font-weight: 800; font-size: 9px; color: #64748b; display: block; margin-bottom: 2px; }
        .pdf-date-value { font-family: monospace; font-weight: 800; font-size: 16px; color: #0f172a; }
        
        .pdf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background-color: #e2e8f0; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 25px; }
        .pdf-grid-item { background-color: #ffffff; padding: 12px 15px; }
        .pdf-label { text-transform: uppercase; font-weight: 800; font-size: 9px; color: #94a3b8; display: block; margin-bottom: 3px; }
        .pdf-value { font-weight: 700; color: #1e293b; font-size: 13px; }
        .pdf-subvalue { font-size: 11px; color: #64748b; margin-top: 2px; }
        .pdf-accent { font-weight: 800; color: #2563eb; }

        .pdf-section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
        .pdf-section-title { text-transform: uppercase; font-weight: 900; font-size: 11px; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
        .pdf-section-title.orange { color: #c2410c; }
        .pdf-section-title.green { color: #15803d; }
        .pdf-section-dot { width: 6px; height: 6px; border-radius: 9999px; }
        .pdf-section-dot.orange { background-color: #ea580c; }
        .pdf-section-dot.green { background-color: #16a34a; }
        
        .pdf-list-container { border-radius: 10px; padding: 12px; min-height: 160px; border: 1px solid; }
        .pdf-list-container.orange { background-color: #fffaf5; border-color: #ffedd5; }
        .pdf-list-container.green { background-color: #f7fee7; border-color: #dcfce7; }
        
        .pdf-list { list-style: none; padding: 0; margin: 0; }
        .pdf-list-item { display: flex; align-items: flex-start; gap: 10px; font-size: 12px; font-weight: 700; margin-bottom: 6px; }
        .pdf-list-item.orange { color: #7c2d12; }
        .pdf-list-item.green { color: #14532d; }
        .pdf-check { width: 14px; height: 14px; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 9px; flex-shrink: 0; margin-top: 2px; }
        .pdf-check.orange { background-color: #fed7aa; color: #c2410c; }
        .pdf-check.green { background-color: #bbf7d0; color: #15803d; }
        
        .pdf-brief-box { margin-bottom: 25px; padding: 15px 20px; background-color: #f5f3ff; border-left: 4px solid #6366f1; border-radius: 4px; }
        .pdf-brief-label { text-transform: uppercase; font-weight: 800; font-size: 9px; color: #818cf8; display: block; margin-bottom: 6px; }
        .pdf-brief-text { color: #1e1b4b; font-style: italic; font-weight: 600; line-height: 1.5; margin: 0; font-size: 12px; }
        
        .pdf-comment-box { margin-bottom: 25px; }
        .pdf-comment-content { padding: 12px 15px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 12px; color: #334155; }
        
        .pdf-signatures { margin-top: 30px; padding-top: 20px; border-top: 2px solid #0f172a; }
        .pdf-sig-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .pdf-sig-item { display: flex; flex-direction: column; gap: 8px; }
        .pdf-sig-canvas { height: 80px; border-bottom: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; padding: 5px; background-color: #fafafa; }
        .pdf-sig-img { max-height: 100%; max-width: 100%; object-fit: contain; }
        .pdf-sig-info { text-align: center; margin-top: 4px; }
        .pdf-sig-name { text-transform: uppercase; font-weight: 800; font-size: 10px; color: #0f172a; }
        .pdf-sig-role { text-transform: uppercase; font-weight: 700; font-size: 8px; color: #64748b; }
        .pdf-sig-role.lfs { color: #2563eb; }
        
        .pdf-footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-size: 9px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.1em; }
        
        /* Page break handling */
        .pdf-grid, .pdf-section-grid, .pdf-brief-box, .pdf-comment-box, .pdf-signatures {
          page-break-inside: avoid !important;
        }
      `}</style>
      <div id="pdf-content" className="pdf-container">
        
        {/* Header Section */}
        <div className="pdf-header">
          <div>
            <h1 className="pdf-title">Sikker Jobb Analyse</h1>
            <div className="pdf-meta">
              <span>Dokumentnr: SJA-{data.id || 'NY'}</span>
              <div className="pdf-dot"></div>
              <span>Iht. FSE § 10</span>
            </div>
          </div>
          <div className="pdf-date-box">
            <span className="pdf-date-label">Dato</span>
            <span className="pdf-date-value">{data.dato}</span>
          </div>
        </div>

        {/* Project Info Grid */}
        <div className="pdf-grid">
          <div className="pdf-grid-item">
            <span className="pdf-label">Prosjekt / Lokasjon</span>
            <div className="pdf-value">{data.prosjektNavn || 'Ikke oppgitt'}</div>
            <div className="pdf-subvalue">{data.lokasjon || 'Ingen lokasjon angitt'}</div>
          </div>
          <div className="pdf-grid-item">
            <span className="pdf-label">Arbeidsoppgave</span>
            <div className="pdf-value">{data.jobbNavn || 'Ingen beskrivelse'}</div>
            <div className="pdf-subvalue">Metode: <span className="pdf-accent">{data.arbeidsmetode || 'Ikke valgt'}</span></div>
          </div>
          <div className="pdf-grid-item">
            <span className="pdf-label">Ansvarlig LFS</span>
            <div className="pdf-value">{data.ansvarligLFS || 'Ikke oppgitt'}</div>
          </div>
          <div className="pdf-grid-item">
            <span className="pdf-label">Deltakere</span>
            <div className="pdf-value">
              {data.deltakere?.length > 0 
                ? data.deltakere.map((d: any) => d.navn).join(', ') 
                : 'Ingen andre deltakere'}
            </div>
          </div>
        </div>

        {/* Risks and Measures Section */}
        <div className="pdf-section-grid">
          <div>
            <h2 className="pdf-section-title orange">
              <div className="pdf-section-dot orange"></div>
              Identifiserte Risikomomenter
            </h2>
            <div className="pdf-list-container orange">
              <ul className="pdf-list">
                {farerListe.length > 0 ? farerListe.map(f => (
                  <li key={f} className="pdf-list-item orange">
                    <div className="pdf-check orange">✓</div>
                    {labels[f] || f}
                  </li>
                )) : <li className="pdf-subvalue italic">Ingen spesifikke farer valgt</li>}
              </ul>
            </div>
          </div>

          <div>
            <h2 className="pdf-section-title green">
              <div className="pdf-section-dot green"></div>
              Sikkerhetstiltak
            </h2>
            <div className="pdf-list-container green">
              <ul className="pdf-list">
                {tiltakListe.length > 0 ? tiltakListe.map(t => (
                  <li key={t} className="pdf-list-item green">
                    <div className="pdf-check green">✓</div>
                    {labels[t] || t}
                  </li>
                )) : <li className="pdf-subvalue italic">Ingen spesifikke tiltak valgt</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Briefing Section */}
        {data.sikkerhetsbrief && (
          <div className="pdf-brief-box">
            <span className="pdf-brief-label">Sikkerhetsbriefing (Toolbox Talk)</span>
            <p className="pdf-brief-text">
              "{data.sikkerhetsbrief}"
            </p>
          </div>
        )}

        {/* Comments Section */}
        {data.kommentarer && (
          <div className="pdf-comment-box">
            <span className="pdf-label">Kommentarer / Avvik</span>
            <div className="pdf-comment-content">
              {data.kommentarer}
            </div>
          </div>
        )}

        {/* Signatures Section */}
        <div className="pdf-signatures">
          <h2 className="pdf-label">Signaturer og Godkjenning</h2>
          <div className="pdf-sig-grid">
            <div className="pdf-sig-item">
              <div className="pdf-sig-canvas">
                {data.lfsSignaturData && <img src={data.lfsSignaturData} className="pdf-sig-img" />}
              </div>
              <div className="pdf-sig-info">
                <div className="pdf-sig-name">{data.ansvarligLFS}</div>
                <div className="pdf-sig-role lfs">Leder for sikkerhet</div>
              </div>
            </div>

            {data.deltakere?.map((d: any, i: number) => (
              <div key={i} className="pdf-sig-item">
                <div className="pdf-sig-canvas">
                  {d.signaturData && <img src={d.signaturData} className="pdf-sig-img" />}
                </div>
                <div className="pdf-sig-info">
                  <div className="pdf-sig-name">{d.navn}</div>
                  <div className="pdf-sig-role">Deltaker</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pdf-footer">
          <span>Generert av SJA-App</span>
          <span>Side 1 av 1</span>
        </div>

      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [viewMode, setViewMode] = useState<'create' | 'list' | 'detail'>('create');
  const [arkiv, setArkiv] = useState<any[]>([]);
  const [selectedSja, setSelectedSja] = useState<any>(null);
  
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  
  // AI States
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  
  const [activeSigner, setActiveSigner] = useState<string | number | null>(null);
  const [formData, setFormData] = useState(getInitialFormData());
  const [printData, setPrintData] = useState<any>(null);

  const apiFetch = async (url: string, options: any = {}) => {
    const token = localStorage.getItem('sja_token');
    const headers: Record<string, string> = {
      ...(options.headers || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });
  };

  // Autentisering
  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(err => console.error("Auth check failed", err));
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.token) {
          localStorage.setItem('sja_token', data.token);
        }
        setUser({ id: data.userId, username });
      } else {
        setAuthError(data.error || 'Autentisering feilet');
      }
    } catch (err) {
      setAuthError('Nettverksfeil');
    }
  };

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('sja_token');
    setUser(null);
    setViewMode('create');
  };

  // Hent arkiv
  useEffect(() => {
    if (!user || viewMode !== 'list') return;
    apiFetch('/api/sja')
      .then(async res => {
        if (!res.ok) {
          if (res.status === 401) {
            setUser(null);
            localStorage.removeItem('sja_token');
            throw new Error("Sesjonen har utløpt. Vennligst logg inn på nytt.");
          }
          const errorData = await res.json();
          throw new Error(errorData.error || res.statusText);
        }
        return res.json();
      })
      .then(data => setArkiv(data))
      .catch(err => {
        console.error("Kunne ikke hente arkiv", err);
        alert(`Kunne ikke hente arkiv: ${err.message}`);
      });
  }, [user, viewMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (category: 'farer' | 'tiltak', item: string) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [item]: !prev[category][item]
      }
    }));
  };

  const leggTilDeltaker = () => {
    setFormData(prev => ({
      ...prev,
      deltakere: [...prev.deltakere, { navn: '', signaturData: null }]
    }));
  };

  const oppdaterDeltaker = (index: number, navn: string) => {
    const nyeDeltakere = [...formData.deltakere];
    nyeDeltakere[index].navn = navn;
    setFormData(prev => ({ ...prev, deltakere: nyeDeltakere }));
  };

  const fjernDeltaker = (index: number) => {
    const nyeDeltakere = [...formData.deltakere];
    nyeDeltakere.splice(index, 1);
    setFormData(prev => ({ ...prev, deltakere: nyeDeltakere }));
  };

  const lagreSignatur = (dataUrl: string) => {
    if (activeSigner === 'lfs') {
      setFormData(prev => ({ ...prev, lfsSignaturData: dataUrl }));
    } else if (typeof activeSigner === 'number') {
      const nyeDeltakere = [...formData.deltakere];
      nyeDeltakere[activeSigner].signaturData = dataUrl;
      setFormData(prev => ({ ...prev, deltakere: nyeDeltakere }));
    }
    setActiveSigner(null);
  };

  const hentLokasjon = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      setFormData(prev => ({ ...prev, lokasjon: 'Geolokasjon støttes ikke' }));
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const stedsnavn = data.display_name || `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`;
          setFormData(prev => ({ ...prev, lokasjon: stedsnavn }));
        } catch (error) {
          setFormData(prev => ({ ...prev, lokasjon: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}` }));
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setFormData(prev => ({ ...prev, lokasjon: 'Kunne ikke hente lokasjon' }));
        setIsLocating(false);
      }
    );
  };

  const foreslaaMedKI = async () => {
    if (!formData.jobbNavn) {
      alert("Vennligst beskriv arbeidsoppdraget først.");
      setStep(1);
      return;
    }
    setIsGeneratingAI(true);
    try {
      const schema = {
        type: "OBJECT",
        properties: {
          farer: {
            type: "OBJECT",
            properties: {
              strømgjennomgang: { type: "BOOLEAN" },
              lysbue: { type: "BOOLEAN" },
              fall: { type: "BOOLEAN" },
              klemfare: { type: "BOOLEAN" },
              asbest: { type: "BOOLEAN" },
              dårligLys: { type: "BOOLEAN" },
              trafikk: { type: "BOOLEAN" },
              skjulteKabler: { type: "BOOLEAN" }
            }
          },
          tiltak: {
            type: "OBJECT",
            properties: {
              frakoblet: { type: "BOOLEAN" },
              låstOgMerket: { type: "BOOLEAN" },
              spenningsprøvd: { type: "BOOLEAN" },
              kortsluttetOgJordet: { type: "BOOLEAN" },
              avskjerming: { type: "BOOLEAN" },
              verneutstyr: { type: "BOOLEAN" }
            }
          }
        }
      };

      const prompt = `Som elektroinstallatør iht. FSE, vurder arbeidsoppdraget: "${formData.jobbNavn}" på lokasjon "${formData.lokasjon}". 
      Returner en JSON med sannsynlige farer og nødvendige sikkerhetstiltak.`;
      
      const forslag = await callGeminiAPI(prompt, true, schema);
      
      if (forslag && forslag.farer && forslag.tiltak) {
        setFormData(prev => ({
          ...prev,
          farer: { ...prev.farer, ...forslag.farer },
          tiltak: { ...prev.tiltak, ...forslag.tiltak }
        }));
      }
    } catch (error) {
      console.error("KI-forslag feilet", error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const genererSikkerhetsbrief = async () => {
    setIsGeneratingBrief(true);
    try {
      const farerListe = Object.entries(formData.farer).filter(([_, v]) => v).map(([k]) => k).join(", ");
      const tiltakListe = Object.entries(formData.tiltak).filter(([_, v]) => v).map(([k]) => k).join(", ");
      
      const prompt = `Lag en kort "Toolbox talk" for montørene.
      Jobb: ${formData.jobbNavn}
      Farer: ${farerListe}
      Tiltak: ${tiltakListe}`;
      
      const brief = await callGeminiAPI(prompt, false);
      if (brief) {
        setFormData(prev => ({ ...prev, sikkerhetsbrief: brief }));
      }
    } catch (error) {
      console.error("Brief-generering feilet", error);
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const handlePrint = async (data: any) => {
    if (!data) return;
    setPrintData(data);
    setIsDownloadingPdf(true);
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
      
      // Wait for React to render the hidden PrintDocument with new printData
      setTimeout(() => {
        const element = document.getElementById('pdf-content');
        if (!element) {
          console.error("PDF content element not found");
          setIsDownloadingPdf(false);
          return;
        }
        
        const opt = {
          margin: 0,
          filename: `SJA_${(data.jobbNavn || 'dokument').replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg', quality: 1 },
          html2canvas: { 
            scale: 2, 
            useCORS: true,
            logging: false,
            letterRendering: true,
            width: 794
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        (window as any).html2pdf()
          .from(element)
          .set(opt)
          .save()
          .then(() => {
            setIsDownloadingPdf(false);
          })
          .catch((err: any) => {
            console.error("PDF generation error:", err);
            setIsDownloadingPdf(false);
            alert("Kunne ikke generere PDF. Prøv igjen.");
          });
      }, 1200);
    } catch (err) {
      console.error("Failed to load html2pdf:", err);
      setIsDownloadingPdf(false);
      alert("Kunne ikke laste PDF-verktøy. Sjekk internettforbindelsen.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/sja', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsSubmitted(true);
        // Auto-redirect to list after 2 seconds
        setTimeout(() => {
          setViewMode('list');
          setIsSubmitted(false);
        }, 2500);
      } else {
        if (res.status === 401) {
          setUser(null);
          localStorage.removeItem('sja_token');
          alert("Sesjonen har utløpt. Vennligst logg inn på nytt.");
        } else {
          const errorData = await res.json();
          alert(`Kunne ikke lagre: ${errorData.error || res.statusText}`);
        }
      }
    } catch (err) {
      console.error("Lagring feilet", err);
      alert("Nettverksfeil ved lagring. Sjekk internettforbindelsen.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="flex justify-center mb-6">
            <ShieldAlert className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">
            {authMode === 'login' ? 'Logg inn på SJA' : 'Registrer bruker'}
          </h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Brukernavn</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Passord</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {authError && <p className="text-red-500 text-sm">{authError}</p>}
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center"
            >
              {authMode === 'login' ? <LogIn className="w-5 h-5 mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
              {authMode === 'login' ? 'Logg inn' : 'Registrer'}
            </button>
          </form>
          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            className="w-full mt-4 text-sm text-blue-600 hover:underline"
          >
            {authMode === 'login' ? 'Trenger du en konto? Registrer deg' : 'Har du allerede konto? Logg inn'}
          </button>
        </div>
      </div>
    );
  }

  let content;
  if (isSubmitted) {
    content = (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 w-full">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">SJA Lagret</h2>
          <p className="text-slate-600">Sikker jobb analyse for <strong>{formData.jobbNavn}</strong> er lagret.</p>
          <button
            onClick={() => handlePrint(formData)}
            disabled={isDownloadingPdf}
            className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-3 rounded-xl transition-colors flex items-center justify-center border border-indigo-200"
          >
            {isDownloadingPdf ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Printer className="w-5 h-5 mr-2" />}
            Last ned PDF
          </button>
          <div className="flex gap-3">
            <button onClick={() => { setFormData(getInitialFormData()); setStep(1); setIsSubmitted(false); setViewMode('create'); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl">Ny SJA</button>
            <button onClick={() => { setViewMode('list'); setIsSubmitted(false); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl">Arkiv</button>
          </div>
        </div>
      </div>
    );
  } else if (viewMode === 'list') {
    content = (
      <div className="max-w-4xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center"><Archive className="w-8 h-8 mr-3 text-blue-600" /> SJA Arkiv</h1>
          <button onClick={() => setViewMode('create')} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center"><Plus className="w-5 h-5 mr-2" /> Ny SJA</button>
        </div>
        {arkiv.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center border-2 border-dashed border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Ingen SJA-dokumenter funnet i arkivet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {arkiv.map((sja) => (
              <div key={sja.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{sja.prosjektNavn || 'Uten prosjekt'}</span>
                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">{sja.jobbNavn}</h3>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-slate-500">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-xs text-slate-500"><MapPin className="w-3 h-3 mr-2" /> {sja.lokasjon}</div>
                  <div className="flex items-center text-xs text-slate-500"><User className="w-3 h-3 mr-2" /> {sja.ansvarligLFS}</div>
                  <div className="flex items-center text-xs text-slate-500"><Calendar className="w-3 h-3 mr-2" /> {sja.dato}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setSelectedSja(sja); setViewMode('detail'); }}
                    className="flex-1 bg-slate-900 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center"
                  >
                    Se detaljer
                  </button>
                  <button 
                    onClick={() => handlePrint(sja)} 
                    disabled={isDownloadingPdf}
                    className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else if (viewMode === 'detail' && selectedSja) {
    const farerListe = Object.entries(selectedSja.farer || {}).filter(([_, v]) => v).map(([k]) => k);
    const tiltakListe = Object.entries(selectedSja.tiltak || {}).filter(([_, v]) => v).map(([k]) => k);
    const labels: Record<string, string> = {
      strømgjennomgang: 'Strømgjennomgang', lysbue: 'Kortslutning / Lysbue', fall: 'Arbeid i høyden / Fall',
      klemfare: 'Klemfare / Tunge løft', asbest: 'Asbest / Farlige stoffer', dårligLys: 'Dårlig belysning / Sikt',
      trafikk: 'Trafikkfare / Påkjørsel', skjulteKabler: 'Gravearbeid / Skjulte kabler', frakoblet: 'Frakoblet anleggsdel',
      låstOgMerket: 'Sikret mot innkobling', spenningsprøvd: 'Spenningsløshet konstatert',
      kortsluttetOgJordet: 'Kortsluttet og jordet', avskjerming: 'Avskjerming', verneutstyr: 'Personlig verneutstyr'
    };

    content = (
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setViewMode('list')} className="flex items-center text-slate-600 font-bold hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" /> Tilbake til arkiv
          </button>
          <button 
            onClick={() => handlePrint(selectedSja)} 
            disabled={isDownloadingPdf}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {isDownloadingPdf ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Printer className="w-5 h-5 mr-2" />}
            Last ned PDF
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-slate-900 p-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Sikker Jobb Analyse</h1>
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Dokumentnr: SJA-{selectedSja.id}</p>
              </div>
              <div className="text-right">
                <div className="text-blue-400 font-mono font-bold text-xl">{selectedSja.dato}</div>
                <div className="text-[10px] uppercase font-black text-slate-500">Gjennomført dato</div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Prosjektinformasjon</h3>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="mb-4">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Prosjekt</span>
                    <div className="font-bold text-slate-800 text-lg">{selectedSja.prosjektNavn || 'Ikke oppgitt'}</div>
                  </div>
                  <div className="mb-4">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Lokasjon</span>
                    <div className="font-medium text-slate-700 flex items-start"><MapPin className="w-4 h-4 mr-2 mt-0.5 text-blue-500" /> {selectedSja.lokasjon}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Arbeidsoppgave</span>
                    <div className="font-bold text-slate-800">{selectedSja.jobbNavn}</div>
                    <div className="mt-2 inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-black uppercase tracking-widest">{selectedSja.arbeidsmetode}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Ansvar og Team</h3>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="mb-4">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Leder for sikkerhet (LFS)</span>
                    <div className="font-bold text-slate-800 flex items-center"><User className="w-4 h-4 mr-2 text-blue-500" /> {selectedSja.ansvarligLFS}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Deltakere ({selectedSja.deltakere?.length || 0})</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedSja.deltakere?.map((d: any, i: number) => (
                        <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600">{d.navn}</span>
                      )) || <span className="text-xs italic text-slate-400">Ingen andre deltakere</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-orange-500">Risikovurdering</h3>
                <div className="bg-orange-50/30 border border-orange-100 rounded-2xl p-6">
                  <ul className="space-y-3">
                    {farerListe.map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm font-bold text-orange-900">
                        <AlertTriangle className="w-4 h-4 text-orange-500" /> {labels[f] || f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-green-600">Sikkerhetstiltak</h3>
                <div className="bg-green-50/30 border border-green-100 rounded-2xl p-6">
                  <ul className="space-y-3">
                    {tiltakListe.map(t => (
                      <li key={t} className="flex items-center gap-3 text-sm font-bold text-green-900">
                        <CheckCircle2 className="w-4 h-4 text-green-500" /> {labels[t] || t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {selectedSja.sikkerhetsbrief && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Toolbox Talk / Briefing</h3>
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 italic text-indigo-900 font-medium leading-relaxed">
                  "{selectedSja.sikkerhetsbrief}"
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Signaturer</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                  <div className="h-16 flex items-center justify-center mb-2">
                    {selectedSja.lfsSignaturData && <img src={selectedSja.lfsSignaturData} className="max-h-full" />}
                  </div>
                  <div className="text-[10px] font-black uppercase text-slate-800 truncate">{selectedSja.ansvarligLFS}</div>
                  <div className="text-[8px] font-bold text-blue-500 uppercase">LFS</div>
                </div>
                {selectedSja.deltakere?.map((d: any, i: number) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <div className="h-16 flex items-center justify-center mb-2">
                      {d.signaturData && <img src={d.signaturData} className="max-h-full" />}
                    </div>
                    <div className="text-[10px] font-black uppercase text-slate-800 truncate">{d.navn}</div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase">Deltaker</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="max-w-2xl w-full">
        <div className="flex justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">{user.username}</span>
            <button onClick={handleLogout} className="text-xs text-red-500 hover:underline flex items-center ml-2"><LogOut className="w-3 h-3 mr-1" /> Logg ut</button>
          </div>
          <button onClick={() => setViewMode('list')} className="flex items-center text-sm font-medium text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 shadow-sm"><Archive className="w-4 h-4 mr-2 text-blue-600" /> Arkiv</button>
        </div>

        {activeSigner !== null && (
          <SignatureModal 
            onClose={() => setActiveSigner(null)} 
            onSave={lagreSignatur}
            title={activeSigner === 'lfs' ? formData.ansvarligLFS : formData.deltakere[activeSigner as number].navn || 'Deltaker'}
          />
        )}

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-slate-900 text-white p-8">
            <div className="flex items-center space-x-3 mb-6">
              <ShieldAlert className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold">Sikker Jobb Analyse</h1>
            </div>
            <div className="flex justify-between items-center relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-700 z-0 rounded-full"></div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 z-0 transition-all duration-300 rounded-full" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full font-bold transition-colors ${step >= num ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {step > num ? <CheckCircle2 className="w-5 h-5" /> : num}
                </div>
              ))}
            </div>
          </div>

          <div className="p-8">
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center border-b pb-2"><Activity className="w-5 h-5 mr-2 text-blue-600" /> Jobbinformasjon</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Prosjektnavn</label>
                    <input type="text" name="prosjektNavn" value={formData.prosjektNavn} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Arbeidsoppdrag</label>
                    <input type="text" name="jobbNavn" value={formData.jobbNavn} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Lokasjon</label>
                      <div className="relative">
                        <input type="text" name="lokasjon" value={formData.lokasjon} onChange={handleInputChange} className="w-full p-3 pr-12 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500" />
                        <button onClick={hentLokasjon} disabled={isLocating} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600">{isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5" />}</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Dato</label>
                      <input type="date" name="dato" value={formData.dato} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Leder for sikkerhet (LFS)</label>
                      <input type="text" name="ansvarligLFS" value={formData.ansvarligLFS} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-semibold text-slate-700">Deltakere</label>
                        <button onClick={leggTilDeltaker} className="text-sm text-blue-600 font-medium flex items-center"><Plus className="w-4 h-4 mr-1" /> Legg til</button>
                      </div>
                      {formData.deltakere.map((d, idx) => (
                        <div key={idx} className="flex items-center space-x-2 mb-2">
                          <input type="text" value={d.navn} onChange={(e) => oppdaterDeltaker(idx, e.target.value)} className="flex-1 p-2.5 rounded-xl border border-slate-300 outline-none text-sm" placeholder="Navn" />
                          <button onClick={() => fjernDeltaker(idx)} className="p-2.5 text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Arbeidsmetode</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['AFA', 'ANV', 'AUS'].map((m) => (
                        <button key={m} onClick={() => setFormData(prev => ({ ...prev, arbeidsmetode: m }))} className={`p-3 rounded-xl border transition-all ${formData.arbeidsmetode === m ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white border-slate-200'}`}>{m}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h2 className="text-xl font-bold text-orange-600 flex items-center"><AlertTriangle className="w-5 h-5 mr-2" /> Identifiser Farer</h2>
                  <button onClick={foreslaaMedKI} disabled={isGeneratingAI} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center disabled:opacity-50">
                    {isGeneratingAI ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} KI-Forslag
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries({
                    strømgjennomgang: 'Strømgjennomgang',
                    lysbue: 'Kortslutning / Lysbue',
                    fall: 'Arbeid i høyden',
                    klemfare: 'Klemfare',
                    asbest: 'Asbest',
                    dårligLys: 'Dårlig lys',
                    trafikk: 'Trafikkfare',
                    skjulteKabler: 'Skjulte kabler'
                  }).map(([key, label]) => (
                    <button key={key} onClick={() => handleCheckboxChange('farer', key)} className={`flex items-center p-4 rounded-xl border transition-all ${formData.farer[key] ? 'bg-orange-50 border-orange-300' : 'bg-white border-slate-200'}`}>
                      <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${formData.farer[key] ? 'bg-orange-500 border-orange-500' : 'bg-white'}`}>{formData.farer[key] && <CheckCircle2 className="w-3 h-3 text-white" />}</div>
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-green-700 flex items-center border-b pb-2"><ShieldAlert className="w-5 h-5 mr-2" /> Sikkerhetstiltak</h2>
                <div className="space-y-3">
                  {Object.entries({
                    frakoblet: 'Frakoblet anleggsdel',
                    låstOgMerket: 'Låst og merket',
                    spenningsprøvd: 'Spenningsløshet konstatert',
                    kortsluttetOgJordet: 'Kortsluttet og jordet',
                    avskjerming: 'Avskjerming',
                    verneutstyr: 'Personlig verneutstyr'
                  }).map(([key, label]) => (
                    <button key={key} onClick={() => handleCheckboxChange('tiltak', key)} className={`flex items-center p-4 rounded-xl border w-full text-left transition-all ${formData.tiltak[key] ? 'bg-green-50 border-green-300' : 'bg-white border-slate-200'}`}>
                      <div className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center ${formData.tiltak[key] ? 'bg-green-500 border-green-500' : 'bg-white'}`}>{formData.tiltak[key] && <CheckCircle2 className="w-3 h-3 text-white" />}</div>
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center border-b pb-2"><PenTool className="w-5 h-5 mr-2 text-blue-600" /> Godkjenning</h2>
                <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-indigo-900 flex items-center"><MessageSquareWarning className="w-4 h-4 mr-2" /> Team Briefing</h3>
                    <button onClick={genererSikkerhetsbrief} disabled={isGeneratingBrief} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center disabled:opacity-50">{isGeneratingBrief ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />} Generer</button>
                  </div>
                  {formData.sikkerhetsbrief && <p className="text-sm text-indigo-800 italic bg-white p-4 rounded-lg border border-indigo-100">"{formData.sikkerhetsbrief}"</p>}
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-white border border-slate-200 rounded-xl flex justify-between items-center">
                    <div><span className="block text-xs text-slate-500">LFS</span><strong>{formData.ansvarligLFS}</strong></div>
                    {formData.lfsSignaturData ? <img src={formData.lfsSignaturData} className="h-10" /> : <button onClick={() => setActiveSigner('lfs')} className="text-sm text-blue-600 font-bold">Signer</button>}
                  </div>
                  {formData.deltakere.map((d, idx) => (
                    <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl flex justify-between items-center">
                      <div><span className="block text-xs text-slate-500">Deltaker</span><strong>{d.navn}</strong></div>
                      {d.signaturData ? <img src={d.signaturData} className="h-10" /> : <button onClick={() => setActiveSigner(idx)} className="text-sm text-blue-600 font-bold">Signer</button>}
                    </div>
                  ))}
                </div>
                <textarea name="kommentarer" value={formData.kommentarer} onChange={handleInputChange} rows={2} className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Kommentarer..."></textarea>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-between items-center">
            <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="flex items-center px-5 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-xl disabled:opacity-50"><ArrowLeft className="w-4 h-4 mr-2" /> Forrige</button>
            {step < 4 ? (
              <button onClick={() => setStep(s => Math.min(4, s + 1))} className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold">Neste <ArrowRight className="w-4 h-4 ml-2" /></button>
            ) : (
              <button onClick={handleSubmit} disabled={isSaving || !formData.lfsSignaturData} className="flex items-center px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold disabled:opacity-50">{isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Lagre SJA</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4 relative">
      {content}
      <PrintDocument data={printData || selectedSja || formData} />
    </div>
  );
};

export default App;
