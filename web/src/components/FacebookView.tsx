"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Eye,
  EyeOff,

  Facebook,
  Heart,
  KeyRound,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { Chip, Field, Modal } from "./ui";
import { glow, text, uid } from "@/lib/theme";
import {
  asignarPaginaFB,
  comentarFB,
  crearPaginaFB,
  detectarPaginasFB,
  createCuentaFB,
  deleteCuentaFB,
  listAllPaginasFB,
  listCuentasFB,
  listPaginasFB,
  estadoCuentaFB,
  loginCuentaFB,
  publicarPostFB,
  reaccionarFB,
  type CuentaFB,
  type PaginaFB,
} from "@/lib/api";
import type { Character, Color } from "@/lib/types";
import { useStored } from "@/lib/useStored";

type FeedTipo = "post" | "comment" | "react";

interface FBEntry {
  id: string;
  tipo: FeedTipo;
  perfil: string;
  pagina: string;
  texto?: string;
  status: "en_cola" | "ok" | "error" | "demo";
  time: string;
}

const POST_TEMPLATES = [
  "Nueva campaña de adopción en barrio norte 🐾",
  "¿Sabías que un gato duerme 16 horas al día?",
  "Rescatamos 3 gatitos en zona sur. Buscan hogar.",
  "Tips de alimentación para gatos adultos.",
  "El refugio necesita voluntarios el sábado.",
];

const COMMENT_TEMPLATES = [
  "¡Qué buena info, gracias por compartir!",
  "Totalmente de acuerdo, lo viví con mi gato.",
  "Lo comparto para que llegue a más gente 🙌",
  "Excelente post, me sirvió mucho.",
  "Yo adopté así, recomiendo 100%.",
];

const PAGE_FALLBACK = "Página demo";

const REACTIONS = [
  { tipo: "like", emoji: "👍" },
  { tipo: "love", emoji: "❤️" },
  { tipo: "haha", emoji: "😆" },
  { tipo: "care", emoji: "🥰" },
];

const TIPO_COLOR: Record<FeedTipo, Color> = {
  post: "cyan",
  comment: "purple",
  react: "pink",
};

const TIPO_LABEL: Record<FeedTipo, string> = {
  post: "fb_post",
  comment: "fb_comment",
  react: "fb_react",
};

function nowTime(): string {
  return new Date().toLocaleTimeString("es-AR", { hour12: false });
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 14);
}

function ParticleLine({ dur = "2.4s" }: { dur?: string }) {
  return (
    <svg className="h-3 w-6 shrink-0" aria-hidden>
      <line x1="0" y1="6" x2="24" y2="6" stroke="#e6e6f0" strokeOpacity="0.2" strokeWidth="1" />
      <circle r="1.4" fill="#f4f4ff" opacity="0.9">
        <animateMotion dur={dur} repeatCount="indefinite" path="M0 6 L24 6" />
      </circle>
    </svg>
  );
}

function ProfileChip({
  perfil,
  page,
}: {
  perfil: Character;
  page?: PaginaFB;
}) {
  return (
    <div className="flex items-center">
      <div className="rounded border border-white/25 bg-[#0b0b13]/90 px-1.5 py-1 font-mono text-[8px] tracking-widest text-slate-100 shadow-[0_0_10px_rgba(255,255,255,0.08)] backdrop-blur">
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1 w-1 rounded-full ${
              perfil.estado === "activo" ? "bg-neon-green" : "bg-neon-yellow"
            }`}
          />
          {perfil.name.toLowerCase()}
        </span>
      </div>
      <ParticleLine dur={page ? "1.8s" : "3.4s"} />
      <span
        className={`min-w-0 truncate font-mono text-[8px] ${
          page ? "text-neon-cyan/80" : "text-slate-600"
        }`}
      >
        {page ? `→ ${slug(page.nombre_publico)}` : "→ sin página"}
      </span>
    </div>
  );
}

function PageCard({
  page,
  assigned,
  posting,
  postText,
  onPostText,
  onSubmitPost,
  onCancelPost,
  onComentar,
  onReaccionar,
  onAsignar,
  perfiles,
  demo,
}: {
  page: PaginaFB;
  assigned?: Character;
  posting: boolean;
  postText: string;
  onPostText: (value: string) => void;
  onSubmitPost: () => void;
  onCancelPost: () => void;
  onComentar: () => void;
  onReaccionar: () => void;
  onAsignar: (perfilId: string) => void;
  perfiles: Character[];
  demo: boolean;
}) {
  const color: Color = assigned?.color ?? "blue";
  return (
    <article className={`neon-card ${glow[color]} flex flex-col p-2.5`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Facebook size={11} className="shrink-0 text-neon-blue" />
          <h3 className="min-w-0 truncate text-[12px] font-medium text-slate-100">
            {page.nombre_publico}
          </h3>
        </div>
        <span
          className={`flex h-4.5 min-w-[22px] shrink-0 items-center justify-center rounded border border-current/30 px-1 py-0.5 font-mono text-[8px] font-bold ${text[color]} bg-neon-blue/10`}
        >
          FB
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[8px]">
        <span className="relative inline-flex h-3 w-6 items-center rounded-full bg-neon-green/25 px-0.5">
          <span className="ml-auto h-2 w-2 rounded-full bg-neon-green shadow-[0_0_6px_rgba(0,255,157,0.8)]" />
        </span>
        <span className="text-neon-green">{demo ? "demo" : page.estado_conexion}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">navegador real</span>
      </div>

      <div className="mt-2 space-y-0.5 font-mono text-[8px] text-slate-500">
        <span className="block">
          • perfil: <span className="text-neon-cyan">{assigned ? assigned.name.toLowerCase() : "—"}</span>
        </span>
        <span className="block">• posts: auto</span>
        <span className="block">• comments: auto</span>
        <span className="block">• check: pass cond.</span>
      </div>

      <div className="mt-2">
        <select
          value={page.personaje_id ?? ""}
          onChange={(event) => onAsignar(event.target.value)}
          disabled={demo}
          aria-label={`Asignar perfil a ${page.nombre_publico}`}
          className="w-full rounded border border-white/10 bg-[#0a0a13] px-1 py-0.5 font-mono text-[9px] text-slate-300 outline-none disabled:opacity-50"
        >
          <option value="">— asignar perfil —</option>
          {perfiles.map((perfil) => (
            <option key={perfil.id} value={perfil.id}>
              {perfil.name}
            </option>
          ))}
        </select>
      </div>

      {posting ? (
        <div className="mt-1.5 flex gap-1">
          <input
            autoFocus
            value={postText}
            onChange={(event) => onPostText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSubmitPost();
              if (event.key === "Escape") onCancelPost();
            }}
            placeholder="¿Qué publica la página?"
            className="input-neon py-1 text-[10px]"
          />
          <button
            type="button"
            onClick={onSubmitPost}
            className="rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-1.5 text-neon-cyan"
            aria-label="Enviar publicación"
          >
            <Send size={11} />
          </button>
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-1 border-t border-white/5 pt-2">
        <span className="font-mono text-[8px] text-slate-600">acciones</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => (demo || posting ? onSubmitPost() : onCancelPost())}
            className="flex items-center gap-0.5 rounded border border-neon-cyan/30 bg-neon-cyan/10 px-1 py-0.5 font-mono text-[8px] text-neon-cyan transition hover:bg-neon-cyan/20"
          >
            <Send size={8} /> pub
          </button>
          <button
            type="button"
            onClick={onComentar}
            className="flex items-center gap-0.5 rounded border border-neon-purple/30 bg-neon-purple/10 px-1 py-0.5 font-mono text-[8px] text-neon-purple transition hover:bg-neon-purple/20"
          >
            <MessageCircle size={8} /> cm
          </button>
          <button
            type="button"
            onClick={onReaccionar}
            className="flex items-center gap-0.5 rounded border border-neon-pink/30 bg-neon-pink/10 px-1 py-0.5 font-mono text-[8px] text-neon-pink transition hover:bg-neon-pink/20"
          >
            <Heart size={8} /> re
          </button>
        </div>
      </div>
    </article>
  );
}

export function FacebookView({ characters }: { characters: Character[] }) {
  const [pages, setPages] = useStored<PaginaFB[]>("pulse.fb.pages.v1", []);
  const [cuentas, setCuentas] = useState<CuentaFB[]>([]);
  const [feed, setFeed] = useStored<FBEntry[]>("pulse.fb.feed.v1", []);
  const [demoOn, setDemoOn] = useStored("pulse.fb.demo.v1", true);
  const [busy, setBusy] = useState(false);
  const [modalCuenta, setModalCuenta] = useState(false);
  const [draft, setDraft] = useState({ nombre_identificador: "", email_o_usuario: "", password: "", totp_secret: "" });
  const [showPw, setShowPw] = useState(false);
  const [postingOn, setPostingOn] = useState<string | null>(null);
  const [postText, setPostText] = useState("");
  const feedTopRef = useRef<HTMLDivElement>(null);

  const perfiles = characters;

  const pushFeed = useCallback(
    (entry: Omit<FBEntry, "id" | "time">) => {
      setFeed((current) =>
        [{ ...entry, id: uid("fbe"), time: nowTime() }, ...current].slice(0, 60),
      );
    },
    [setFeed],
  );

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const [paginas, listaCuentas] = await Promise.all([
        listAllPaginasFB(),
        listCuentasFB(),
      ]);
      setPages(paginas);
      setCuentas(listaCuentas);
    } catch {
      /* backend sin levantar: modo demo */
    } finally {
      setBusy(false);
    }
  }, [setPages]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (feedTopRef.current) feedTopRef.current.scrollTop = 0;
  }, [feed.length]);

  useEffect(() => {
    if (!demoOn || perfiles.length === 0) return;
    const timer = setInterval(() => {
      const perfil = pick(perfiles);
      const page = pages.length > 0 ? pick(pages).nombre_publico : PAGE_FALLBACK;
      const roll = Math.random();
      if (roll < 0.4) {
        pushFeed({ tipo: "post", perfil: perfil.name, pagina: page, texto: pick(POST_TEMPLATES), status: "demo" });
      } else if (roll < 0.8) {
        pushFeed({ tipo: "comment", perfil: perfil.name, pagina: page, texto: pick(COMMENT_TEMPLATES), status: "demo" });
      } else {
        pushFeed({ tipo: "react", perfil: perfil.name, pagina: page, texto: pick(REACTIONS).emoji, status: "demo" });
      }
    }, 2400 + Math.random() * 1500);
    return () => clearInterval(timer);
  }, [demoOn, perfiles, pages, pushFeed]);

  const demoMode = pages.length === 0;
  const okCount = feed.filter((entry) => entry.status === "ok").length;
  const errorCount = feed.filter((entry) => entry.status === "error").length;

  function handleAsignar(page: PaginaFB, personajeId: string) {
    if (!personajeId) return;
    const perfil = perfiles.find((item) => item.id === personajeId);
    void asignarPaginaFB(page.id, personajeId)
      .then(() => {
        setPages((current) =>
          current.map((item) => (item.id === page.id ? { ...item, personaje_id: personajeId } : item)),
        );
        if (perfil) {
          pushFeed({
            tipo: "post",
            perfil: perfil.name,
            pagina: page.nombre_publico,
            texto: "perfil asignado a la página",
            status: "ok",
          });
        }
      })
      .catch((error: unknown) => {
        pushFeed({
          tipo: "post",
          perfil: "sistema",
          pagina: page.nombre_publico,
          texto: error instanceof Error ? error.message : "error asignación",
          status: "error",
        });
      });
  }

  function handlePublicar(page: PaginaFB, perfil: Character | undefined, mensaje: string) {
    setPostingOn(null);
    setPostText("");
    const texto = mensaje.trim() || pick(POST_TEMPLATES);
    pushFeed({ tipo: "post", perfil: perfil?.name ?? "sistema", pagina: page.nombre_publico, texto, status: "en_cola" });
    if (demoMode) return;
    void publicarPostFB({ pagina_id: page.id, mensaje: texto })
      .then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        pushFeed({ tipo: "post", perfil: perfil?.name ?? "sistema", pagina: page.nombre_publico, texto, status: "ok" });
      })
      .catch((error: unknown) => {
        pushFeed({
          tipo: "post",
          perfil: perfil?.name ?? "sistema",
          pagina: page.nombre_publico,
          texto: error instanceof Error ? error.message : "error",
          status: "error",
        });
      });
  }

  function handleComentar(page: PaginaFB, perfil: Character | undefined) {
    const mensaje = pick(COMMENT_TEMPLATES);
    pushFeed({ tipo: "comment", perfil: perfil?.name ?? "sistema", pagina: page.nombre_publico, texto: mensaje, status: "en_cola" });
    if (demoMode) return;
    void comentarFB({
      post_url: `https://facebook.com/${page.id_plataforma}/posts/${Date.now()}`,
      mensaje,
      personaje_id: page.personaje_id ?? undefined,
    })
      .then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 900));
        pushFeed({ tipo: "comment", perfil: perfil?.name ?? "sistema", pagina: page.nombre_publico, texto: mensaje, status: "ok" });
      })
      .catch((error: unknown) => {
        pushFeed({
          tipo: "comment",
          perfil: perfil?.name ?? "sistema",
          pagina: page.nombre_publico,
          texto: error instanceof Error ? error.message : "error",
          status: "error",
        });
      });
  }

  function handleReaccionar(page: PaginaFB, perfil: Character | undefined) {
    const reaccion = pick(REACTIONS);
    pushFeed({ tipo: "react", perfil: perfil?.name ?? "sistema", pagina: page.nombre_publico, texto: reaccion.emoji, status: "en_cola" });
    if (demoMode) return;
    void reaccionarFB({
      object_url: `https://facebook.com/${page.id_plataforma}/posts/${Date.now()}`,
      tipo: reaccion.tipo,
      personaje_id: page.personaje_id ?? undefined,
    })
      .then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 700));
        pushFeed({ tipo: "react", perfil: perfil?.name ?? "sistema", pagina: page.nombre_publico, texto: reaccion.emoji, status: "ok" });
      })
      .catch((error: unknown) => {
        pushFeed({
          tipo: "react",
          perfil: perfil?.name ?? "sistema",
          pagina: page.nombre_publico,
          texto: error instanceof Error ? error.message : "error",
          status: "error",
        });
      });
  }

  async function handleRegistrarCuenta() {
    setBusy(true);
    try {
      await createCuentaFB(draft);
      setModalCuenta(false);
      setDraft({ nombre_identificador: "", email_o_usuario: "", password: "", totp_secret: "" });
      await refresh();
      pushFeed({ tipo: "post", perfil: "sistema", pagina: "cuenta registrada", status: "ok" });
    } catch (error) {
      pushFeed({
        tipo: "post",
        perfil: "sistema",
        pagina: "error registro",
        texto: error instanceof Error ? error.message : "error",
        status: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  function handleLogin(cuenta: CuentaFB) {
    pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: "abriendo navegador…", status: "en_cola" });
    setCuentas((current) =>
      current.map((item) =>
        item.id === cuenta.id ? { ...item, estado_conexion: "conectando" } : item,
      ),
    );
    void loginCuentaFB(cuenta.id)
      .then(() => new Promise<void>((resolve) => setTimeout(resolve, 2500)))
      .then(async () => {
        // El login corre en segundo plano: sondear hasta conectado/error
        for (let intento = 0; intento < 40; intento++) {
          const estado = await estadoCuentaFB(cuenta.id);
          if (estado.estado_conexion === "conectado" || estado.estado_conexion === "error") {
            setCuentas((current) =>
              current.map((item) =>
                item.id === cuenta.id
                  ? { ...item, estado_conexion: estado.estado_conexion, ultima_conexion: estado.ultima_conexion }
                  : item,
              ),
            );
            pushFeed(
              estado.estado_conexion === "conectado"
                ? { tipo: "post", perfil: cuenta.nombre_identificador, pagina: "sesión abierta", status: "ok" }
                : { tipo: "post", perfil: cuenta.nombre_identificador, pagina: "login rechazado (¿checkpoint o credenciales?)", status: "error" },
            );
            await refresh();
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
        pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: "login sigue en curso…", status: "en_cola" });
      })
      .catch((error: unknown) => {
        pushFeed({
          tipo: "post",
          perfil: cuenta.nombre_identificador,
          pagina: "login falló",
          texto: error instanceof Error ? error.message : "error",
          status: "error",
        });
        setCuentas((current) =>
          current.map((item) =>
            item.id === cuenta.id ? { ...item, estado_conexion: "error" } : item,
          ),
        );
      });
  }

  function handleDetectarPaginas(cuenta: CuentaFB) {
    void detectarPaginasFB(cuenta.id)
      .then((encontradas) => {
        setPages((current) => {
          const ids = new Set(current.map((page) => page.id));
          return [...current, ...encontradas.filter((page) => !ids.has(page.id))];
        });
        pushFeed({
          tipo: "post",
          perfil: cuenta.nombre_identificador,
          pagina: `${encontradas.length} páginas detectadas`,
          status: "ok",
        });
      })
      .catch((error: unknown) => {
        pushFeed({
          tipo: "post",
          perfil: cuenta.nombre_identificador,
          pagina: "detección falló",
          texto: error instanceof Error ? error.message : "error",
          status: "error",
        });
      });
  }

  function handleCrearPagina(cuenta: CuentaFB) {
    const nombre = window.prompt("Nombre de la nueva Página de Facebook:");
    if (!nombre || !nombre.trim()) return;
    const categoria = window.prompt("Categoría (ej. Comunidad, Marca, Artista):") || "Comunidad";
    pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: `creando "${nombre.trim()}"…`, status: "en_cola" });
    void crearPaginaFB(cuenta.id, nombre.trim(), categoria.trim())
      .then((resultado) => {
        if (resultado.status === "creada") {
          pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: `página creada: ${resultado.nombre}`, status: "ok" });
          return detectarPaginasFB(cuenta.id);
        }
        pushFeed({
          tipo: "post",
          perfil: cuenta.nombre_identificador,
          pagina: "creación falló",
          texto: resultado.error ?? "error",
          status: "error",
        });
        return null;
      })
      .then((encontradas) => {
        if (!encontradas) return;
        setPages((current) => {
          const ids = new Set(current.map((page) => page.id));
          return [...current, ...encontradas.filter((page) => !ids.has(page.id))];
        });
      })
      .catch((error: unknown) => {
        pushFeed({
          tipo: "post",
          perfil: cuenta.nombre_identificador,
          pagina: "creación falló",
          texto: error instanceof Error ? error.message : "error",
          status: "error",
        });
      });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* breadcrumb + stats estilo header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1a1a2e] bg-[#05050a]/95 px-3 py-2 backdrop-blur sm:gap-4">
        <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
          <span>facebook /</span>
          <span className="text-neon-cyan">pulse-os</span>
        </div>

        <div className="no-scrollbar ml-auto flex items-center gap-3 overflow-x-auto font-mono text-[9px] text-slate-500 sm:gap-5">
          <span>
            <span className="text-neon-green font-semibold">{perfiles.length}</span> perfiles
          </span>
          <span>
            <span className="text-neon-cyan font-semibold">{pages.length || "demo"}</span> páginas
          </span>
          <span>
            <span className="text-neon-purple font-semibold">{feed.length}</span> interacciones
          </span>
          <span className="hidden sm:inline">
            <span className={`font-semibold ${errorCount ? "text-neon-red" : "text-slate-400"}`}>{errorCount}</span> errores
          </span>
        </div>

        <button
          type="button"
          onClick={() => setDemoOn(!demoOn)}
          className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] transition ${
            demoOn
              ? "border-neon-red/40 bg-neon-red/10 text-neon-red"
              : "border-white/10 bg-white/[0.03] text-slate-500 hover:text-slate-300"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${demoOn ? "animate-pulse bg-neon-red" : "bg-slate-600"}`} />
          {demoOn ? "EN VIVO" : "apagado"}
        </button>
        <button
          type="button"
          onClick={refresh}
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:text-neon-cyan"
          aria-label="Refrescar"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        </button>
        <button
          type="button"
          onClick={() => setModalCuenta(true)}
          className="shrink-0 rounded-md border border-neon-blue/30 bg-neon-blue/10 px-2 py-1 font-mono text-[9px] text-neon-blue transition hover:bg-neon-blue/20"
        >
          <Plus size={10} className="inline" /> cuenta
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 xl:flex-row xl:overflow-hidden">
        {/* PERFILES — chips blancos con partículas */}
        <section className="flex min-h-0 flex-col xl:w-[240px] xl:shrink-0">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[8px] tracking-widest text-slate-500">
            <span>PERFILES · activos</span>
            <span>{perfiles.length}</span>
          </div>
          <div className="mesh-grid relative rounded-lg border border-white/[0.05] bg-[#050509] p-2">
            <div className="no-scrollbar flex max-h-[420px] min-h-0 flex-col gap-2 overflow-y-auto xl:max-h-none">
              {perfiles.length === 0 ? (
                <p className="p-2 text-center font-mono text-[9px] text-slate-600">
                  sin personajes
                </p>
              ) : (
                perfiles.map((perfil) => {
                  const page = pages.find((item) => item.personaje_id === perfil.id);
                  return (
                    <div key={perfil.id} className="animate-chip-in">
                      <ProfileChip perfil={perfil} page={page} />
                      <div className="ml-2 mt-0.5 font-mono text-[7px] text-slate-600">
                        {perfil.temperamento} · actividad {perfil.actividad}/10
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {cuentas.length > 0 ? (
            <div className="mt-2 space-y-1">
              <div className="font-mono text-[8px] tracking-widest text-slate-500">CUENTAS</div>
              {cuentas.map((cuenta) => (
                <div
                  key={cuenta.id}
                  className="flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.02] px-1.5 py-1"
                >
                  <KeyRound size={9} className="shrink-0 text-neon-yellow" />
                  <span className="min-w-0 flex-1 truncate font-mono text-[8px] text-slate-300">
                    {cuenta.nombre_identificador}
                  </span>
                  <span
                    className={`shrink-0 font-mono text-[7px] ${
                      cuenta.estado_conexion === "conectado" ? "text-neon-green" : "text-neon-yellow"
                    }`}
                  >
                    {cuenta.estado_conexion}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLogin(cuenta)}
                    className="shrink-0 rounded border border-white/10 px-1 font-mono text-[7px] text-slate-400 transition hover:text-neon-cyan"
                  >
                    login
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDetectarPaginas(cuenta)}
                    className="shrink-0 rounded border border-white/10 px-1 font-mono text-[7px] text-slate-400 transition hover:text-neon-cyan"
                  >
                    págs
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCrearPagina(cuenta)}
                    className="shrink-0 rounded border border-white/10 px-1 font-mono text-[7px] text-slate-400 transition hover:text-neon-cyan"
                  >
                    +pág
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteCuentaFB(cuenta.id).then(refresh)}
                    className="shrink-0 rounded p-0.5 text-slate-600 transition hover:text-neon-red"
                    aria-label="Eliminar cuenta"
                  >
                    <Trash2 size={9} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* PÁGINAS FB — tarjetas neón como bots */}
        <section className="flex min-h-0 flex-col xl:w-[290px] xl:shrink-0">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[8px] tracking-widest text-slate-500">
            <span>PÁGINAS · FB</span>
            <span>{pages.length || "demo"}</span>
          </div>
          <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {pages.map((page, index) => {
              const assigned = perfiles.find((perfil) => perfil.id === page.personaje_id);
              const isDemo = demoMode;
              const pageKey = page.id ?? `demo-${index}`;
              return (
                <PageCard
                  key={pageKey}
                  page={page}
                  assigned={assigned}
                  perfiles={perfiles}
                  demo={isDemo}
                  posting={postingOn === page.id && !isDemo}
                  postText={postText}
                  onPostText={setPostText}
                  onSubmitPost={() => handlePublicar(page, assigned, postText)}
                  onCancelPost={() => {
                    if (isDemo) {
                      handlePublicar(page, assigned, "");
                    } else {
                      setPostingOn(postingOn === page.id ? null : page.id);
                      setPostText("");
                    }
                  }}
                  onComentar={() => handleComentar(page, assigned)}
                  onReaccionar={() => handleReaccionar(page, assigned)}
                  onAsignar={(perfilId) => handleAsignar(page, perfilId)}
                />
              );
            })}
          </div>
        </section>

        {/* FEED EN VIVO — log estilo mesh */}
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[8px] tracking-widest text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${demoOn ? "animate-pulse bg-neon-red" : "bg-slate-600"}`} />
              FEED EN VIVO
            </span>
            <button
              type="button"
              onClick={() => setFeed([])}
              className="flex items-center gap-1 transition hover:text-slate-300"
            >
              <Trash2 size={9} /> limpiar
            </button>
          </div>
          <div className="mesh-grid relative min-h-0 flex-1 rounded-lg border border-white/[0.05] bg-[#050509]">
            <div ref={feedTopRef} className="no-scrollbar h-full space-y-1 overflow-y-auto p-2 font-mono">
              {feed.length === 0 ? (
                <p className="p-3 text-center text-[9px] text-slate-600">
                  esperando actividad de las páginas…
                </p>
              ) : (
                feed.map((entry) => {
                  const color = TIPO_COLOR[entry.tipo];
                  return (
                    <div
                      key={entry.id}
                      className="animate-chip-in flex items-start gap-2 text-[9px] leading-relaxed"
                    >
                      <span className="shrink-0 text-slate-600">{entry.time}</span>
                      <span className={`w-16 shrink-0 truncate ${text[color]}`}>
                        {entry.perfil.toLowerCase().replace(/\s+/g, "_")}
                      </span>
                      <span className="shrink-0 text-slate-600">
                        {entry.tipo === "post" ? "→" : entry.tipo === "comment" ? "↳" : "♡"}
                      </span>
                      <span className="w-20 shrink-0 truncate text-neon-cyan/70">
                        {slug(entry.pagina)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-slate-400">{entry.texto}</span>
                      <span
                        className={`shrink-0 ${
                          entry.status === "ok"
                            ? "text-neon-green"
                            : entry.status === "error"
                            ? "text-neon-red"
                            : entry.status === "en_cola"
                            ? "animate-pulse text-neon-cyan"
                            : "text-slate-600"
                        }`}
                      >
                        {entry.status === "ok" ? (
                          <Check size={9} className="inline" />
                        ) : (
                          entry.status === "demo" ? "sim" : entry.status === "en_cola" ? "···" : "err"
                        )}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Chip>fb_post</Chip>
            <Chip>fb_comment</Chip>
            <Chip>fb_react</Chip>
            <Chip>navegador · sin APIs</Chip>
          </div>
        </section>
      </div>

      <Modal
        open={modalCuenta}
        onClose={() => setModalCuenta(false)}
        title="Registrar cuenta de Facebook"
        subtitle="Las credenciales se cifran y la sesión se maneja con navegador real (sin APIs)."
        footer={
          <>
            <button type="button" onClick={() => setModalCuenta(false)} className="btn-ghost">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleRegistrarCuenta()}
              disabled={busy || !draft.email_o_usuario || !draft.password}
              className="btn-primary"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : null} Registrar
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Email o usuario de Facebook">
            <input
              value={draft.email_o_usuario}
              onChange={(event) => setDraft({ ...draft, email_o_usuario: event.target.value })}
              placeholder="usuario@mail.com"
              className="input-neon font-mono text-[11px]"
            />
          </Field>
          <Field label="Password">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={draft.password}
                onChange={(event) => setDraft({ ...draft, password: event.target.value })}
                className="input-neon font-mono text-[11px] pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Ocultar password" : "Mostrar password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
          <Field label="Código TOTP (2FA)" hint="opcional">
            <input
              value={draft.totp_secret}
              onChange={(event) => setDraft({ ...draft, totp_secret: event.target.value })}
              placeholder="JBSWY3DPEHPK3PXP"
              className="input-neon font-mono text-[11px]"
            />
          </Field>
          <div className="flex flex-wrap gap-1">
            <Chip>sesión persistente</Chip>
            <Chip>checkpoints automáticos</Chip>
          </div>
        </div>
      </Modal>
    </div>
  );
}


