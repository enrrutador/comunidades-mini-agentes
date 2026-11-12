"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
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
import { Field, Modal } from "./ui";
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
  abrirNavegadorVivoFB,
  cerrarNavegadorVivoFB,
  entradaNavegadorVivoFB,
  estadoNavegadorVivoFB,
  frameNavegadorVivoFB,
  importarSesionFB,
  loginCuentaFB,
  publicarPostFB,
  reaccionarFB,
  type CuentaFB,
  type PaginaFB,
} from "@/lib/api";
import type { Character, Color } from "@/lib/types";

type FeedTipo = "post" | "comment" | "react";

interface FBEntry {
  id: string;
  tipo: FeedTipo;
  perfil: string;
  pagina: string;
  texto?: string;
  status: "en_cola" | "ok" | "error";
  time: string;
}

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

function nowTime(): string {
  return new Date().toLocaleTimeString("es-AR", { hour12: false });
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 14);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Error inesperado";
}

/** Chip de estado de conexión con color, para saber de un vistazo si entró. */
function estadoChip(estado: string): { label: string; cls: string; dot: string } {
  switch (estado) {
    case "conectado":
      return {
        label: "conectado",
        cls: "border-neon-green/40 bg-neon-green/10 text-neon-green",
        dot: "bg-neon-green shadow-[0_0_6px_rgba(0,255,157,0.8)]",
      };
    case "conectando":
      return {
        label: "conectando…",
        cls: "border-neon-yellow/40 bg-neon-yellow/10 text-neon-yellow",
        dot: "animate-pulse bg-neon-yellow",
      };
    case "error":
      return {
        label: "error",
        cls: "border-neon-red/40 bg-neon-red/10 text-neon-red",
        dot: "bg-neon-red",
      };
    default:
      return {
        label: estado || "desconectado",
        cls: "border-white/10 bg-white/[0.03] text-slate-400",
        dot: "bg-slate-500",
      };
  }
}

function ProfileChip({
  perfil,
  page,
}: {
  perfil: Character;
  page?: PaginaFB;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="rounded border border-white/25 bg-[#0b0b13]/90 px-1.5 py-1 font-mono text-[8px] tracking-widest text-slate-100">
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1 w-1 rounded-full ${
              perfil.estado === "activo" ? "bg-neon-green" : "bg-neon-yellow"
            }`}
          />
          {perfil.name.toLowerCase()}
        </span>
      </div>
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
  onTogglePost,
  onSubmitPost,
  onCancelPost,
  onComentar,
  onReaccionar,
  onAsignar,
  perfiles,
}: {
  page: PaginaFB;
  assigned?: Character;
  posting: boolean;
  postText: string;
  onPostText: (value: string) => void;
  onTogglePost: () => void;
  onSubmitPost: () => void;
  onCancelPost: () => void;
  onComentar: () => void;
  onReaccionar: () => void;
  onAsignar: (perfilId: string) => void;
  perfiles: Character[];
}) {
  const color: Color = assigned?.color ?? "blue";
  const chip = estadoChip(page.estado_conexion);
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
        <span className={`h-1.5 w-1.5 rounded-full ${chip.dot}`} />
        <span className="text-slate-400">{page.estado_conexion}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">navegador real</span>
      </div>

      <div className="mt-2 space-y-0.5 font-mono text-[8px] text-slate-500">
        <span className="block">
          • perfil:{" "}
          <span className="text-neon-cyan">
            {assigned ? assigned.name.toLowerCase() : "sin asignar"}
          </span>
        </span>
        {page.url ? (
          <span className="block truncate">
            • url: <span className="text-slate-400">{page.url}</span>
          </span>
        ) : null}
        <span className="block truncate">
          • id: <span className="text-slate-400">{page.id_plataforma}</span>
        </span>
      </div>

      <div className="mt-2">
        <select
          value={page.personaje_id ?? ""}
          onChange={(event) => onAsignar(event.target.value)}
          aria-label={`Asignar perfil a ${page.nombre_publico}`}
          className="w-full rounded border border-white/10 bg-[#0a0a13] px-1 py-0.5 font-mono text-[9px] text-slate-300 outline-none"
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
            disabled={!postText.trim()}
            className="rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-1.5 text-neon-cyan disabled:opacity-40"
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
            onClick={onTogglePost}
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
  // Páginas y feed: SOLO estado de sesión alimentado por el backend.
  // Nada se persiste en localStorage ni se inventa actividad.
  const [pages, setPages] = useState<PaginaFB[]>([]);
  const [cuentas, setCuentas] = useState<CuentaFB[]>([]);
  const [paginasPorCuenta, setPaginasPorCuenta] = useState<Record<string, number>>({});
  const [feed, setFeed] = useState<FBEntry[]>([]);
  const [fbError, setFbError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalCuenta, setModalCuenta] = useState(false);
  const [modalSesion, setModalSesion] = useState<CuentaFB | null>(null);
  const [vivo, setVivo] = useState<CuentaFB | null>(null);
  const [vivoOk, setVivoOk] = useState(false);
  const [vivoTexto, setVivoTexto] = useState("");
  const vivoImgRef = useRef<HTMLImageElement | null>(null);
  const vivoTimersRef = useRef<number[]>([]);
  const vivoUrlRef = useRef<string | null>(null);
  const vivoFrameRef = useRef(0);
  const [sesionTexto, setSesionTexto] = useState("");
  const [sesionError, setSesionError] = useState("");
  const [draft, setDraft] = useState({ nombre_identificador: "", email_o_usuario: "", password: "", totp_secret: "" });
  const [showPw, setShowPw] = useState(false);
  const [postingOn, setPostingOn] = useState<string | null>(null);
  const [postText, setPostText] = useState("");
  const feedTopRef = useRef<HTMLDivElement>(null);

  const perfiles = characters;

  const pushFeed = useCallback((entry: Omit<FBEntry, "id" | "time">) => {
    setFeed((current) =>
      [{ ...entry, id: uid("fbe"), time: nowTime() }, ...current].slice(0, 60),
    );
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const [paginas, listaCuentas] = await Promise.all([
        listAllPaginasFB(),
        listCuentasFB(),
      ]);
      setPages(paginas);
      setCuentas(listaCuentas);
      setFbError("");
      const counts: Record<string, number> = {};
      await Promise.all(
        listaCuentas.map(async (cuenta) => {
          try {
            const propias = await listPaginasFB(cuenta.id);
            counts[cuenta.id] = propias.length;
          } catch {
            counts[cuenta.id] = 0;
          }
        }),
      );
      setPaginasPorCuenta(counts);
    } catch (e) {
      setPages([]);
      setCuentas([]);
      setFbError(
        `No pude conectar con el backend (${errorText(e)}). Sin conexión no se muestra ninguna cuenta ni Página inventada.`,
      );
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (feedTopRef.current) feedTopRef.current.scrollTop = 0;
  }, [feed.length]);

  const errorCount = feed.filter((entry) => entry.status === "error").length;
  const cuentasConectadas = useMemo(
    () => cuentas.filter((c) => c.estado_conexion === "conectado").length,
    [cuentas],
  );

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
          texto: errorText(error),
          status: "error",
        });
      });
  }

  function handlePublicar(page: PaginaFB, perfil: Character | undefined) {
    const texto = postText.trim();
    if (!texto) {
      pushFeed({
        tipo: "post",
        perfil: perfil?.name ?? "sistema",
        pagina: page.nombre_publico,
        texto: "escribí el texto del post antes de publicar (no se manda nada vacío ni de ejemplo)",
        status: "error",
      });
      return;
    }
    setPostingOn(null);
    setPostText("");
    pushFeed({ tipo: "post", perfil: perfil?.name ?? "sistema", pagina: page.nombre_publico, texto, status: "en_cola" });
    void publicarPostFB({ pagina_id: page.id, mensaje: texto })
      .then((res) => {
        pushFeed({
          tipo: "post",
          perfil: perfil?.name ?? "sistema",
          pagina: page.nombre_publico,
          texto: res.message,
          status: "en_cola",
        });
      })
      .catch((error: unknown) => {
        pushFeed({
          tipo: "post",
          perfil: perfil?.name ?? "sistema",
          pagina: page.nombre_publico,
          texto: errorText(error),
          status: "error",
        });
      });
  }

  function handleComentar(page: PaginaFB, perfil: Character | undefined) {
    const url = window.prompt("URL del post de Facebook a comentar:");
    if (!url || !url.trim()) return;
    const mensaje = window.prompt("Texto del comentario:");
    if (!mensaje || !mensaje.trim()) return;
    pushFeed({ tipo: "comment", perfil: perfil?.name ?? "sistema", pagina: page.nombre_publico, texto: mensaje.trim(), status: "en_cola" });
    void comentarFB({
      post_url: url.trim(),
      mensaje: mensaje.trim(),
      personaje_id: page.personaje_id ?? undefined,
    })
      .then((res) => {
        pushFeed({
          tipo: "comment",
          perfil: perfil?.name ?? "sistema",
          pagina: page.nombre_publico,
          texto: res.message,
          status: res.verificado ? "ok" : "en_cola",
        });
      })
      .catch((error: unknown) => {
        pushFeed({
          tipo: "comment",
          perfil: perfil?.name ?? "sistema",
          pagina: page.nombre_publico,
          texto: errorText(error),
          status: "error",
        });
      });
  }

  function handleReaccionar(page: PaginaFB, perfil: Character | undefined) {
    const url = window.prompt("URL del post o comentario a reaccionar:");
    if (!url || !url.trim()) return;
    const tipoRaw = window.prompt(
      `Tipo de reacción (${REACTIONS.map((r) => r.tipo).join(", ")}):`,
      "like",
    );
    if (tipoRaw === null) return;
    const reaccion =
      REACTIONS.find((r) => r.tipo === tipoRaw.trim().toLowerCase()) ?? REACTIONS[0];
    pushFeed({ tipo: "react", perfil: perfil?.name ?? "sistema", pagina: page.nombre_publico, texto: reaccion.emoji, status: "en_cola" });
    void reaccionarFB({
      object_url: url.trim(),
      tipo: reaccion.tipo,
      personaje_id: page.personaje_id ?? undefined,
    })
      .then((res) => {
        pushFeed({
          tipo: "react",
          perfil: perfil?.name ?? "sistema",
          pagina: page.nombre_publico,
          texto: res.message,
          status: res.verificado ? "ok" : "en_cola",
        });
      })
      .catch((error: unknown) => {
        pushFeed({
          tipo: "react",
          perfil: perfil?.name ?? "sistema",
          pagina: page.nombre_publico,
          texto: errorText(error),
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
        texto: errorText(error),
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
            if (estado.estado_conexion === "conectado") {
              pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: "sesión abierta · detectando Páginas…", status: "ok" });
              // Al conectar, detectar las Páginas automáticamente.
              try {
                const encontradas = await detectarPaginasFB(cuenta.id);
                pushFeed({
                  tipo: "post",
                  perfil: cuenta.nombre_identificador,
                  pagina: `${encontradas.length} Páginas detectadas`,
                  status: "ok",
                });
              } catch (error) {
                pushFeed({
                  tipo: "post",
                  perfil: cuenta.nombre_identificador,
                  pagina: "la detección automática de Páginas falló",
                  texto: errorText(error),
                  status: "error",
                });
              }
            } else {
              pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: "login rechazado (¿checkpoint o credenciales?)", status: "error" });
            }
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
          texto: errorText(error),
          status: "error",
        });
        setCuentas((current) =>
          current.map((item) =>
            item.id === cuenta.id ? { ...item, estado_conexion: "error" } : item,
          ),
        );
      });
  }

  function handleImportarSesion() {
    if (!modalSesion) return;
    const cuenta = modalSesion;
    let parsed: unknown;
    try {
      parsed = JSON.parse(sesionTexto.trim());
    } catch {
      setSesionError("Eso no es un JSON válido. Pegá la exportación completa de cookies.");
      return;
    }
    const payload = Array.isArray(parsed)
      ? { cookies: parsed as unknown[] }
      : { storage_state: parsed };
    setBusy(true);
    setSesionError("");
    void importarSesionFB(cuenta.id, payload)
      .then(async () => {
        setModalSesion(null);
        setSesionTexto("");
        pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: "sesión importada · verificando…", status: "en_cola" });
        setCuentas((current) =>
          current.map((item) =>
            item.id === cuenta.id ? { ...item, estado_conexion: "conectando" } : item,
          ),
        );
        for (let intento = 0; intento < 40; intento++) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const estado = await estadoCuentaFB(cuenta.id);
          if (estado.estado_conexion === "conectado" || estado.estado_conexion === "error") {
            if (estado.estado_conexion === "conectado") {
              pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: "sesión abierta · detectando Páginas…", status: "ok" });
              try {
                const encontradas = await detectarPaginasFB(cuenta.id);
                pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: `${encontradas.length} Páginas detectadas`, status: "ok" });
              } catch {
                pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: "la detección automática de Páginas falló", status: "error" });
              }
            } else {
              pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: "la sesión importada no sirvió", texto: estado.estado_autorizacion ?? undefined, status: "error" });
            }
            await refresh();
            return;
          }
        }
        pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: "la verificación sigue en curso…", status: "en_cola" });
      })
      .catch((error: unknown) => {
        setSesionError(errorText(error));
        setModalSesion(cuenta);
      })
      .finally(() => setBusy(false));
  }

  function pararVivo() {
    vivoTimersRef.current.forEach((id) => window.clearInterval(id));
    vivoTimersRef.current = [];
    if (vivoUrlRef.current) {
      URL.revokeObjectURL(vivoUrlRef.current);
      vivoUrlRef.current = null;
    }
  }

  function cerrarVivo() {
    const cuenta = vivo;
    pararVivo();
    setVivo(null);
    setVivoOk(false);
    setVivoTexto("");
    if (cuenta) void cerrarNavegadorVivoFB(cuenta.id).catch(() => {});
  }

  function abrirVivo(cuenta: CuentaFB) {
    setVivo(cuenta);
    setVivoOk(false);
    setVivoTexto("");
    vivoFrameRef.current = 0;
    pararVivo();
    void abrirNavegadorVivoFB(cuenta.id)
      .then(() => {
        const frameTimer = window.setInterval(() => {
          void frameNavegadorVivoFB(cuenta.id, vivoFrameRef.current).then((r) => {
            if (!r || !vivoImgRef.current) return;
            vivoFrameRef.current = r.id;
            if (vivoUrlRef.current) URL.revokeObjectURL(vivoUrlRef.current);
            vivoUrlRef.current = URL.createObjectURL(r.blob);
            vivoImgRef.current.src = vivoUrlRef.current;
          }).catch(() => {});
        }, 350);
        const estadoTimer = window.setInterval(() => {
          void estadoNavegadorVivoFB(cuenta.id).then((e) => {
            if (e.conectado) {
              setVivoOk(true);
              void refresh();
              window.setTimeout(() => cerrarVivo(), 2500);
            }
          }).catch(() => {});
        }, 2000);
        vivoTimersRef.current = [frameTimer, estadoTimer];
      })
      .catch((error) => {
        pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: `No se pudo abrir el navegador de la app: ${error instanceof Error ? error.message : String(error)}`, status: "error" });
      });
  }

  function vivoClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!vivo) return;
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    if (!img.naturalWidth || !rect.width) return;
    const x = ((e.clientX - rect.left) / rect.width) * img.naturalWidth;
    const y = ((e.clientY - rect.top) / rect.height) * img.naturalHeight;
    void entradaNavegadorVivoFB(vivo.id, { tipo: "click", x, y }).catch(() => {});
  }

  function vivoInsertar() {
    if (!vivo || !vivoTexto) return;
    void entradaNavegadorVivoFB(vivo.id, { tipo: "texto", texto: vivoTexto }).catch(() => {});
    setVivoTexto("");
  }

  function vivoTecla(tecla: string) {
    if (!vivo) return;
    void entradaNavegadorVivoFB(vivo.id, { tipo: "tecla", tecla }).catch(() => {});
  }

  useEffect(() => {
    return () => {
      vivoTimersRef.current.forEach((id) => window.clearInterval(id));
    };
  }, []);

  function handleDetectarPaginas(cuenta: CuentaFB) {
    pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: "detectando Páginas…", status: "en_cola" });
    void detectarPaginasFB(cuenta.id)
      .then(async (encontradas) => {
        pushFeed({
          tipo: "post",
          perfil: cuenta.nombre_identificador,
          pagina: `${encontradas.length} Páginas detectadas`,
          status: "ok",
        });
        await refresh();
      })
      .catch((error: unknown) => {
        pushFeed({
          tipo: "post",
          perfil: cuenta.nombre_identificador,
          pagina: "detección falló",
          texto: errorText(error),
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
      .then(async (resultado) => {
        if (resultado.status === "creada") {
          pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: `página creada: ${resultado.nombre}`, status: "ok" });
          await refresh();
          return;
        }
        pushFeed({
          tipo: "post",
          perfil: cuenta.nombre_identificador,
          pagina: "creación falló",
          texto: resultado.error ?? "error",
          status: "error",
        });
      })
      .catch((error: unknown) => {
        pushFeed({
          tipo: "post",
          perfil: cuenta.nombre_identificador,
          pagina: "creación falló",
          texto: errorText(error),
          status: "error",
        });
      });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* breadcrumb + stats */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1a1a2e] bg-[#05050a]/95 px-3 py-2 backdrop-blur sm:gap-4">
        <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
          <span>facebook /</span>
          <span className="text-neon-cyan">pulse-os</span>
        </div>

        <div className="no-scrollbar ml-auto flex items-center gap-3 overflow-x-auto font-mono text-[9px] text-slate-500 sm:gap-5">
          <span>
            <span className="text-neon-green font-semibold">{cuentasConectadas}</span> cuentas conectadas
          </span>
          <span>
            <span className="text-neon-green font-semibold">{perfiles.length}</span> perfiles
          </span>
          <span>
            <span className="text-neon-cyan font-semibold">{pages.length}</span> páginas
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
          onClick={() => void refresh()}
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

      {fbError ? (
        <div className="flex shrink-0 items-start gap-2 border-b border-neon-red/30 bg-neon-red/[0.07] px-3 py-2 text-[11px] leading-relaxed text-neon-red">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{fbError}</span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* CUENTA DE FACEBOOK — tarjeta principal: acá se ve si conectó */}
        <section className="border-b border-[#1a1a2e] px-3 py-3">
          <div className="mb-2 flex items-center justify-between font-mono text-[8px] tracking-widest text-slate-500">
            <span>CUENTA DE FACEBOOK</span>
            <span>
              {cuentas.length === 0
                ? "sin cuenta"
                : `${cuentasConectadas}/${cuentas.length} conectadas`}
            </span>
          </div>
          {cuentas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center">
              <p className="font-mono text-[10px] leading-relaxed text-slate-500">
                Sin cuenta conectada. Registrá la tuya con el botón «+ cuenta»:
                acá vas a ver su estado de conexión y sus Páginas, sin vueltas.
              </p>
            </div>
          ) : (
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
              {cuentas.map((cuenta) => {
                const chip = estadoChip(cuenta.estado_conexion);
                const cantidad = paginasPorCuenta[cuenta.id];
                return (
                  <article
                    key={cuenta.id}
                    className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <KeyRound size={13} className="shrink-0 text-neon-yellow" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-100">
                        {cuenta.nombre_identificador}
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[8px] ${chip.cls}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${chip.dot}`} />
                        {chip.label}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[9px] text-slate-500">
                      <span>
                        <span className="text-neon-cyan">
                          {cantidad ?? "—"}
                        </span>{" "}
                        Páginas detectadas
                      </span>
                      <span>
                        última conexión:{" "}
                        <span className="text-slate-400">
                          {cuenta.ultima_conexion ?? "—"}
                        </span>
                      </span>
                    </div>
                    {cuenta.estado_conexion === "error" &&
                    cuenta.estado_autorizacion &&
                    cuenta.estado_autorizacion !== "pendiente" ? (
                      <div className="mt-2 rounded border border-neon-red/25 bg-neon-red/10 px-2 py-1.5 text-[10px] leading-snug text-rose-200">
                        <span className="font-semibold">Motivo:</span>{" "}
                        {cuenta.estado_autorizacion}
                      </div>
                    ) : null}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => abrirVivo(cuenta)}
                        className="rounded border border-neon-green/30 bg-neon-green/10 px-2 py-1 font-mono text-[9px] text-neon-green transition hover:bg-neon-green/20"
                      >
                        {cuenta.estado_conexion === "conectado"
                          ? "reconectar"
                          : "conectar (login)"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLogin(cuenta)}
                        title="Que la app intente sola con la contraseña guardada"
                        className="rounded border border-white/10 px-2 py-1 font-mono text-[9px] text-slate-400 transition hover:border-white/30 hover:text-slate-200"
                      >
                        automático
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDetectarPaginas(cuenta)}
                        className="rounded border border-white/10 px-2 py-1 font-mono text-[9px] text-slate-300 transition hover:text-neon-cyan"
                      >
                        detectar Páginas
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSesionTexto("");
                          setSesionError("");
                          setModalSesion(cuenta);
                        }}
                        className="rounded border border-white/10 px-2 py-1 font-mono text-[9px] text-slate-300 transition hover:text-neon-cyan"
                      >
                        importar sesión
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCrearPagina(cuenta)}
                        className="rounded border border-white/10 px-2 py-1 font-mono text-[9px] text-slate-300 transition hover:text-neon-cyan"
                      >
                        + Página
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void deleteCuentaFB(cuenta.id).then(() => refresh())
                        }
                        className="ml-auto rounded p-1 text-slate-600 transition hover:text-neon-red"
                        aria-label="Eliminar cuenta"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-2 p-3 xl:flex-row">
          {/* PERFILES — personajes reales del backend */}
          <section className="flex min-h-0 flex-col xl:w-[240px] xl:shrink-0">
            <div className="mb-1.5 flex items-center justify-between font-mono text-[8px] tracking-widest text-slate-500">
              <span>PERFILES · activos</span>
              <span>{perfiles.length}</span>
            </div>
            <div className="mesh-grid relative rounded-lg border border-white/[0.05] bg-[#050509] p-2">
              <div className="no-scrollbar flex max-h-[420px] min-h-0 flex-col gap-2 overflow-y-auto xl:max-h-none">
                {perfiles.length === 0 ? (
                  <p className="p-2 text-center font-mono text-[9px] leading-relaxed text-slate-600">
                    Todavía no hay personajes en el backend.
                  </p>
                ) : (
                  perfiles.map((perfil) => {
                    const page = pages.find((item) => item.personaje_id === perfil.id);
                    return (
                      <div key={perfil.id}>
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
          </section>

          {/* PÁGINAS FB reales */}
          <section className="flex min-h-0 flex-col xl:w-[290px] xl:shrink-0">
            <div className="mb-1.5 flex items-center justify-between font-mono text-[8px] tracking-widest text-slate-500">
              <span>PÁGINAS · FB</span>
              <span>{pages.length}</span>
            </div>
            <div className="space-y-2">
              {pages.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center font-mono text-[9px] leading-relaxed text-slate-600">
                  Todavía no hay Páginas detectadas. Conectá tu cuenta arriba
                  y la detección corre sola; también podés tocar «detectar
                  Páginas» en la tarjeta de la cuenta.
                </p>
              ) : (
                pages.map((page) => {
                  const assigned = perfiles.find((perfil) => perfil.id === page.personaje_id);
                  return (
                    <PageCard
                      key={page.id}
                      page={page}
                      assigned={assigned}
                      perfiles={perfiles}
                      posting={postingOn === page.id}
                      postText={postingOn === page.id ? postText : ""}
                      onPostText={setPostText}
                      onTogglePost={() => {
                        setPostingOn(postingOn === page.id ? null : page.id);
                        setPostText("");
                      }}
                      onSubmitPost={() => handlePublicar(page, assigned)}
                      onCancelPost={() => {
                        setPostingOn(null);
                        setPostText("");
                      }}
                      onComentar={() => handleComentar(page, assigned)}
                      onReaccionar={() => handleReaccionar(page, assigned)}
                      onAsignar={(perfilId) => handleAsignar(page, perfilId)}
                    />
                  );
                })
              )}
            </div>
          </section>

          {/* FEED — solo acciones reales hechas desde esta pantalla */}
          <section className="flex min-h-0 flex-1 flex-col">
            <div className="mb-1.5 flex items-center justify-between font-mono text-[8px] tracking-widest text-slate-500">
              <span>ACTIVIDAD · acciones desde esta pantalla</span>
              <button
                type="button"
                onClick={() => setFeed([])}
                className="flex items-center gap-1 transition hover:text-slate-300"
              >
                <Trash2 size={9} /> limpiar
              </button>
            </div>
            <div className="mesh-grid relative min-h-[220px] rounded-lg border border-white/[0.05] bg-[#050509]">
              <div ref={feedTopRef} className="no-scrollbar h-full max-h-[520px] space-y-1 overflow-y-auto p-2 font-mono">
                {feed.length === 0 ? (
                  <p className="p-3 text-center text-[9px] leading-relaxed text-slate-600">
                    Todavía no hay actividad. Cuando conectes la cuenta o una
                    Página publique, comente o reaccione desde acá, queda
                    registrado en este feed con su resultado real.
                  </p>
                ) : (
                  feed.map((entry) => {
                    const color = TIPO_COLOR[entry.tipo];
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start gap-2 text-[9px] leading-relaxed"
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
                        <span className="min-w-0 flex-1 text-slate-400">{entry.texto}</span>
                        <span
                          className={`shrink-0 ${
                            entry.status === "ok"
                              ? "text-neon-green"
                              : entry.status === "error"
                                ? "text-neon-red"
                                : "animate-pulse text-neon-cyan"
                          }`}
                        >
                          {entry.status === "ok" ? (
                            <Check size={9} className="inline" />
                          ) : entry.status === "en_cola" ? (
                            "···"
                          ) : (
                            "err"
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {vivo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3">
          <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0a0a14]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <span className="font-mono text-[10px] tracking-widest text-neon-cyan">
                NAVEGADOR DE LA APP — {vivo.nombre_identificador}
              </span>
              <button type="button" onClick={cerrarVivo} className="btn-ghost px-2 py-1 text-xs">
                ✕ cerrar
              </button>
            </div>
            {vivoOk ? (
              <div className="px-4 py-10 text-center">
                <p className="text-[15px] font-semibold text-neon-green">¡Sesión guardada!</p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">
                  La cuenta quedó conectada. Esto se cierra solo…
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-auto bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={vivoImgRef}
                    alt="Navegador de la app: pantalla de inicio de sesión de Facebook"
                    onClick={vivoClick}
                    className="w-full cursor-pointer select-none"
                  />
                </div>
                <div className="border-t border-white/10 px-3 py-2.5">
                  <p className="mb-2 font-mono text-[9px] leading-relaxed text-slate-500">
                    Tocá un campo en la pantalla del navegador, escribí acá abajo con el
                    teclado de tu teléfono y tocá «insertar». Cuando la sesión entre, se
                    guarda sola y la cuenta queda conectada.
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <input
                      value={vivoTexto}
                      onChange={(e) => setVivoTexto(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") vivoInsertar();
                      }}
                      placeholder="escribí acá y tocá insertar…"
                      className="min-w-0 flex-1 rounded border border-white/15 bg-black/40 px-2.5 py-1.5 text-[12px] text-slate-100 outline-none placeholder:text-slate-600 focus:border-neon-cyan/50"
                    />
                    <button
                      type="button"
                      onClick={vivoInsertar}
                      className="rounded border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1.5 font-mono text-[10px] text-neon-cyan transition hover:bg-neon-cyan/20"
                    >
                      insertar
                    </button>
                    <button type="button" onClick={() => vivoTecla("Backspace")} className="rounded border border-white/15 px-2.5 py-1.5 font-mono text-[10px] text-slate-300">⌫</button>
                    <button type="button" onClick={() => vivoTecla("Enter")} className="rounded border border-white/15 px-2.5 py-1.5 font-mono text-[10px] text-slate-300">Enter ⏎</button>
                    <button type="button" onClick={() => vivoTecla("Tab")} className="rounded border border-white/15 px-2.5 py-1.5 font-mono text-[10px] text-slate-300">Tab ⇥</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <Modal
        open={modalSesion !== null}
        onClose={() => setModalSesion(null)}
        title="Importar sesión de Facebook"
        subtitle="Pegá las cookies de una sesión ya abierta en tu navegador: la cuenta queda conectada sin login con contraseña."
        footer={
          <>
            <button type="button" onClick={() => setModalSesion(null)} className="btn-ghost">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleImportarSesion()}
              disabled={busy || !sesionTexto.trim()}
              className="btn-primary"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : null} Importar
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[11px] leading-relaxed text-slate-400">
            En tu teléfono: abrí Facebook en <span className="text-slate-200">Firefox</span> con la cuenta
            ya ingresada, exportá las cookies de facebook.com en formato JSON con el
            complemento <span className="text-slate-200">Cookie Manager</span> y pegá acá la exportación completa.
            La sesión se guarda cifrada y se verifica sola.
          </p>
          <Field label="Cookies de facebook.com (JSON)">
            <textarea
              value={sesionTexto}
              onChange={(event) => setSesionTexto(event.target.value)}
              placeholder='[{"name": "c_user", "value": "...", "domain": ".facebook.com", ...}]'
              rows={8}
              className="input-neon w-full font-mono text-[10px]"
            />
          </Field>
          {sesionError ? (
            <p className="rounded border border-neon-red/25 bg-neon-red/10 px-2 py-1.5 text-[10px] text-rose-200">
              {sesionError}
            </p>
          ) : null}
        </div>
      </Modal>

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
        </div>
      </Modal>
    </div>
  );
}
