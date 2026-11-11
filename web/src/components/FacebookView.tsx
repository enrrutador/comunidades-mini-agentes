"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Facebook,
  Heart,
  KeyRound,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  ThumbsUp,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Chip, Field, Modal, StatusDot } from "./ui";
import { glow, text, uid } from "@/lib/theme";
import {
  asignarPaginaFB,
  comentarFB,
  createCuentaFB,
  deleteCuentaFB,
  listAllPaginasFB,
  listCuentasFB,
  listPaginasFB,
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
  "Nueva campaña de adopción en barrio norte. Más info en el post 🐾",
  "¿Sabías que un gato duerme 16 horas al día? Te cuento en el post de hoy.",
  "Rescatamos 3 gatitos en zona sur. Buscan hogar responsable.",
  "Tips de alimentación para gatos adultos, los comparto acá.",
  "Hoy el refugio necesita voluntarios para la tarde del sábado.",
];

const COMMENT_TEMPLATES = [
  "¡Qué buena info, gracias por compartir!",
  "Totalmente de acuerdo, lo viví con mi gato.",
  "Lo comparto para que llegue a más gente 🙌",
  "Excelente post, me sirvió mucho.",
  "Yo adopté así, recomiendo 100%.",
];

const REACTIONS = [
  { tipo: "like", emoji: "👍" },
  { tipo: "love", emoji: "❤️" },
  { tipo: "haha", emoji: "😆" },
  { tipo: "care", emoji: "🥰" },
];

const PAGE_FALLBACK = "Fans de la comunidad";

function nowTime(): string {
  return new Date().toLocaleTimeString("es-AR", { hour12: false });
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

const TIPO_META: Record<FeedTipo, { icon: React.ReactNode; color: Color }> = {
  post: { icon: <Send size={9} />, color: "cyan" },
  comment: { icon: <MessageCircle size={9} />, color: "purple" },
  react: { icon: <Heart size={9} />, color: "pink" },
};

function Avatar({ name, color }: { name: string; color: Color }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/40 ${text[color]} bg-white/[0.03] font-mono text-[9px] font-bold`}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function FlowChannel() {
  return (
    <div className="relative hidden w-8 shrink-0 items-center justify-center lg:flex">
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <line
          x1="50%" y1="6%" x2="50%" y2="94%"
          stroke="#e6e6f0" strokeOpacity="0.16" strokeWidth="1"
        />
        <line
          x1="50%" y1="6%" x2="50%" y2="94%"
          stroke="#e6e6f0" strokeOpacity="0.8" strokeWidth="1.2"
          className="animate-flow"
        />
      </svg>
    </div>
  );
}

export function FacebookView({
  characters,
  workspaceId,
  workspaceName,
}: {
  characters: Character[];
  workspaceId: string;
  workspaceName: string;
}) {
  const [pages, setPages] = useStored<PaginaFB[]>("pulse.fb.pages.v1", []);
  const [cuentas, setCuentas] = useState<CuentaFB[]>([]);
  const [feed, setFeed] = useStored<FBEntry[]>("pulse.fb.feed.v1", []);
  const [demoOn, setDemoOn] = useStored("pulse.fb.demo.v1", true);
  const [busy, setBusy] = useState(false);
  const [modalCuenta, setModalCuenta] = useState(false);
  const [draft, setDraft] = useState({ nombre_identificador: "", email_o_usuario: "", password: "", totp_secret: "" });
  const [postingOn, setPostingOn] = useState<string | null>(null);
  const [postText, setPostText] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  const perfiles = useMemo(
    () =>
      characters.filter(
        (character) => workspaceId === "pulse-os" || character.communityId === workspaceId,
      ),
    [characters, workspaceId],
  );

  const pushFeed = useCallback((entry: Omit<FBEntry, "id" | "time">) => {
    setFeed((current) =>
      [{ ...entry, id: uid("fbe"), time: nowTime() }, ...current].slice(0, 60),
    );
  }, [setFeed]);

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
    const node = feedRef.current;
    if (node) node.scrollTop = 0;
  }, [feed.length]);

  // Generador de actividad demo: las páginas interactúan solas
  useEffect(() => {
    if (!demoOn || perfiles.length === 0) return;
    const timer = setInterval(() => {
      const perfil = pick(perfiles);
      const page = pages.length > 0 ? pick(pages).nombre_publico : workspaceName;
      const roll = Math.random();
      if (roll < 0.4) {
        pushFeed({
          tipo: "post",
          perfil: perfil.name,
          pagina: page,
          texto: pick(POST_TEMPLATES),
          status: "demo",
        });
      } else if (roll < 0.8) {
        pushFeed({
          tipo: "comment",
          perfil: perfil.name,
          pagina: page,
          texto: pick(COMMENT_TEMPLATES),
          status: "demo",
        });
      } else {
        pushFeed({
          tipo: "react",
          perfil: perfil.name,
          pagina: page,
          texto: pick(REACTIONS).emoji,
          status: "demo",
        });
      }
    }, 2600 + Math.random() * 1600);
    return () => clearInterval(timer);
  }, [demoOn, perfiles, pages, pushFeed, workspaceName]);

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

  async function handleLogin(cuenta: CuentaFB) {
    pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: "login navegador…", status: "en_cola" });
    try {
      await loginCuentaFB(cuenta.id);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await refresh();
      pushFeed({ tipo: "post", perfil: cuenta.nombre_identificador, pagina: "sesión abierta", status: "ok" });
    } catch (error) {
      pushFeed({
        tipo: "post",
        perfil: cuenta.nombre_identificador,
        pagina: "login falló",
        texto: error instanceof Error ? error.message : "error",
        status: "error",
      });
    }
  }

  async function handleDetectarPaginas(cuenta: CuentaFB) {
    try {
      const encontradas = await listPaginasFB(cuenta.id);
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
    } catch (error) {
      pushFeed({
        tipo: "post",
        perfil: cuenta.nombre_identificador,
        pagina: "detección falló",
        texto: error instanceof Error ? error.message : "error",
        status: "error",
      });
    }
  }

  async function handleAsignar(page: PaginaFB, personajeId: string) {
    try {
      if (personajeId) {
        await asignarPaginaFB(page.id, personajeId);
        const perfil = perfiles.find((c) => c.id === personajeId);
        setPages((current) =>
          current.map((item) =>
            item.id === page.id ? { ...item, personaje_id: personajeId } : item,
          ),
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
      }
    } catch (error) {
      pushFeed({
        tipo: "post",
        perfil: "sistema",
        pagina: page.nombre_publico,
        texto: error instanceof Error ? error.message : "error asignación",
        status: "error",
      });
    }
  }

  async function handlePublicar(page: PaginaFB, perfil: Character | undefined) {
    const mensaje = postText.trim() || pick(POST_TEMPLATES);
    setPostingOn(null);
    setPostText("");
    pushFeed({
      tipo: "post",
      perfil: perfil?.name ?? "sistema",
      pagina: page.nombre_publico,
      texto: mensaje,
      status: "en_cola",
    });
    try {
      await publicarPostFB({ pagina_id: page.id, mensaje });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      pushFeed({
        tipo: "post",
        perfil: perfil?.name ?? "sistema",
        pagina: page.nombre_publico,
        texto: mensaje,
        status: "ok",
      });
    } catch (error) {
      pushFeed({
        tipo: "post",
        perfil: perfil?.name ?? "sistema",
        pagina: page.nombre_publico,
        texto: error instanceof Error ? error.message : "error",
        status: "error",
      });
    }
  }

  async function handleComentar(page: PaginaFB, perfil: Character | undefined) {
    const mensaje = pick(COMMENT_TEMPLATES);
    pushFeed({
      tipo: "comment",
      perfil: perfil?.name ?? "sistema",
      pagina: page.nombre_publico,
      texto: mensaje,
      status: "en_cola",
    });
    try {
      await comentarFB({
        post_url: `https://facebook.com/${page.id_plataforma}/posts/${Date.now()}`,
        mensaje,
      });
      await new Promise((resolve) => setTimeout(resolve, 1200));
      pushFeed({
        tipo: "comment",
        perfil: perfil?.name ?? "sistema",
        pagina: page.nombre_publico,
        texto: mensaje,
        status: "ok",
      });
    } catch (error) {
      pushFeed({
        tipo: "comment",
        perfil: perfil?.name ?? "sistema",
        pagina: page.nombre_publico,
        texto: error instanceof Error ? error.message : "error",
        status: "error",
      });
    }
  }

  async function handleReaccionar(page: PaginaFB, perfil: Character | undefined) {
    const reaccion = pick(REACTIONS);
    pushFeed({
      tipo: "react",
      perfil: perfil?.name ?? "sistema",
      pagina: page.nombre_publico,
      texto: reaccion.emoji,
      status: "en_cola",
    });
    try {
      await reaccionarFB({
        object_url: `https://facebook.com/${page.id_plataforma}/posts/${Date.now()}`,
        tipo: reaccion.tipo,
      });
      await new Promise((resolve) => setTimeout(resolve, 900));
      pushFeed({
        tipo: "react",
        perfil: perfil?.name ?? "sistema",
        pagina: page.nombre_publico,
        texto: reaccion.emoji,
        status: "ok",
      });
    } catch (error) {
      pushFeed({
        tipo: "react",
        perfil: perfil?.name ?? "sistema",
        pagina: page.nombre_publico,
        texto: error instanceof Error ? error.message : "error",
        status: "error",
      });
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1a1a2e] bg-[#06060b]/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
          <Facebook size={12} className="text-neon-blue" />
          <span className="text-slate-300">facebook /</span>
          <span className="text-neon-cyan">{workspaceName}</span>
        </div>

        <button
          type="button"
          onClick={() => setDemoOn(!demoOn)}
          className={`ml-auto flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] transition ${
            demoOn
              ? "border-neon-red/40 bg-neon-red/10 text-neon-red"
              : "border-white/10 bg-white/[0.03] text-slate-500 hover:text-slate-300"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${demoOn ? "animate-pulse bg-neon-red" : "bg-slate-600"}`} />
          {demoOn ? "LIVE demo" : "demo off"}
        </button>

        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[9px] text-slate-400 transition hover:text-slate-200"
        >
          {busy ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
          refrescar
        </button>

        <button
          type="button"
          onClick={() => setModalCuenta(true)}
          className="btn-primary px-2.5 py-1 text-[10px]"
        >
          <Plus size={11} /> Cuenta FB
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 xl:flex-row xl:overflow-hidden">
        {/* PERFILES */}
        <section className="flex min-h-0 flex-col xl:w-[250px] xl:shrink-0">
          <div className="mb-2 flex items-center justify-between font-mono text-[9px] text-slate-500">
            <span className="tracking-widest">PERFILES</span>
            <span>{perfiles.length}</span>
          </div>
          <div className="no-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {perfiles.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 p-3 text-center font-mono text-[10px] text-slate-600">
                sin personajes en esta comunidad
              </p>
            ) : (
              perfiles.map((perfil) => {
                const page = pages.find((item) => item.personaje_id === perfil.id);
                return (
                  <div
                    key={perfil.id}
                    className={`neon-card ${glow[perfil.color]} flex items-center gap-2 p-2`}
                  >
                    <Avatar name={perfil.name} color={perfil.color} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-medium text-slate-100">
                        {perfil.name}
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[8px] text-slate-500">
                        <StatusDot color={perfil.estado === "activo" ? "green" : "yellow"} />
                        {page ? (
                          <span className="truncate text-neon-cyan">→ {page.nombre_publico}</span>
                        ) : (
                          <span>sin página</span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-[8px] text-slate-600">{perfil.temperamento.slice(0, 8)}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <FlowChannel />

        {/* PAGINAS FB */}
        <section className="flex min-h-0 flex-col xl:w-[300px] xl:shrink-0">
          <div className="mb-2 flex items-center justify-between font-mono text-[9px] text-slate-500">
            <span className="tracking-widest">PÁGINAS FB</span>
            <span>{pages.length || "demo"}</span>
          </div>
          <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {cuentas.length > 0 ? (
              <div className="space-y-1">
                {cuentas.map((cuenta) => (
                  <div
                    key={cuenta.id}
                    className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5"
                  >
                    <KeyRound size={10} className="shrink-0 text-neon-yellow" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-slate-300">
                      {cuenta.nombre_identificador}
                    </span>
                    <span
                      className={`font-mono text-[8px] ${
                        cuenta.estado_conexion === "conectado" ? "text-neon-green" : "text-neon-yellow"
                      }`}
                    >
                      {cuenta.estado_conexion}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleLogin(cuenta)}
                      className="rounded border border-white/10 px-1 py-0.5 font-mono text-[8px] text-slate-400 transition hover:text-neon-cyan"
                    >
                      login
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDetectarPaginas(cuenta)}
                      className="rounded border border-white/10 px-1 py-0.5 font-mono text-[8px] text-slate-400 transition hover:text-neon-cyan"
                    >
                      páginas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void deleteCuentaFB(cuenta.id).then(refresh);
                      }}
                      className="rounded p-0.5 text-slate-600 transition hover:text-neon-red"
                      aria-label="Eliminar cuenta"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {(pages.length > 0 ? pages : DEMO_PAGES).map((page, index) => {
              const assigned = perfiles.find((perfil) => perfil.id === page.personaje_id);
              const demoPage = pages.length === 0;
              return (
                <div
                  key={page.id ?? `demo-${index}`}
                  className={`neon-card ${glow[(assigned?.color ?? "blue") as Color]} flex flex-col p-2.5`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Facebook size={11} className="shrink-0 text-neon-blue" />
                      <span className="min-w-0 truncate text-[11px] font-medium text-slate-100">
                        {page.nombre_publico}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 font-mono text-[8px] ${
                        demoPage || page.estado_conexion === "conectado"
                          ? "text-neon-green"
                          : "text-neon-yellow"
                      }`}
                    >
                      {demoPage ? "demo" : page.estado_conexion}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-1.5">
                    <UserPlus size={9} className="shrink-0 text-slate-500" />
                    <select
                      value={page.personaje_id ?? ""}
                      onChange={(event) => void handleAsignar(page, event.target.value)}
                      disabled={demoPage}
                      aria-label={`Asignar perfil a ${page.nombre_publico}`}
                      className="min-w-0 flex-1 rounded border border-white/10 bg-[#0a0a13] px-1 py-0.5 font-mono text-[9px] text-slate-300 outline-none disabled:opacity-50"
                    >
                      <option value="">— asignar perfil —</option>
                      {perfiles.map((perfil) => (
                        <option key={perfil.id} value={perfil.id}>
                          {perfil.name}
                        </option>
                      ))}
                    </select>
                    {assigned ? <Avatar name={assigned.name} color={assigned.color} /> : null}
                  </div>

                  {postingOn === page.id ? (
                    <div className="mt-1.5 flex gap-1">
                      <input
                        autoFocus
                        value={postText}
                        onChange={(event) => setPostText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void handlePublicar(page, assigned);
                          if (event.key === "Escape") setPostingOn(null);
                        }}
                        placeholder="¿Qué publica esta página?"
                        className="input-neon py-1 text-[10px]"
                      />
                    </div>
                  ) : null}

                  <div className="mt-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        demoPage
                          ? pushFeed({
                              tipo: "post",
                              perfil: assigned?.name ?? perfiles[0]?.name ?? "página",
                              pagina: page.nombre_publico,
                              texto: pick(POST_TEMPLATES),
                              status: "demo",
                            })
                          : setPostingOn(postingOn === page.id ? null : page.id)
                      }
                      className="flex items-center gap-1 rounded-md border border-neon-cyan/30 bg-neon-cyan/10 px-1.5 py-1 font-mono text-[8px] text-neon-cyan transition hover:bg-neon-cyan/20"
                    >
                      <Send size={9} /> publicar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        demoPage
                          ? pushFeed({
                              tipo: "comment",
                              perfil: assigned?.name ?? perfiles[0]?.name ?? "página",
                              pagina: page.nombre_publico,
                              texto: pick(COMMENT_TEMPLATES),
                              status: "demo",
                            })
                          : void handleComentar(page, assigned)
                      }
                      className="flex items-center gap-1 rounded-md border border-neon-purple/30 bg-neon-purple/10 px-1.5 py-1 font-mono text-[8px] text-neon-purple transition hover:bg-neon-purple/20"
                    >
                      <MessageCircle size={9} /> comentar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        demoPage
                          ? pushFeed({
                              tipo: "react",
                              perfil: assigned?.name ?? perfiles[0]?.name ?? "página",
                              pagina: page.nombre_publico,
                              texto: pick(REACTIONS).emoji,
                              status: "demo",
                            })
                          : void handleReaccionar(page, assigned)
                      }
                      className="flex items-center gap-1 rounded-md border border-neon-pink/30 bg-neon-pink/10 px-1.5 py-1 font-mono text-[8px] text-neon-pink transition hover:bg-neon-pink/20"
                    >
                      <ThumbsUp size={9} /> reaccionar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <FlowChannel />

        {/* INTERACCIONES EN VIVO */}
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="mb-2 flex items-center justify-between font-mono text-[9px] text-slate-500">
            <span className="flex items-center gap-1.5 tracking-widest">
              <span className={`h-1.5 w-1.5 rounded-full ${demoOn ? "animate-pulse bg-neon-red" : "bg-slate-600"}`} />
              INTERACCIONES EN VIVO
            </span>
            <button
              type="button"
              onClick={() => setFeed([])}
              className="flex items-center gap-1 transition hover:text-slate-300"
            >
              <Trash2 size={9} /> limpiar
            </button>
          </div>
          <div
            ref={feedRef}
            className="no-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1"
          >
            {feed.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 p-4 text-center font-mono text-[10px] text-slate-600">
                esperando actividad de las páginas…
              </p>
            ) : (
              feed.map((entry) => {
                const meta = TIPO_META[entry.tipo];
                return (
                  <div
                    key={entry.id}
                    className={`animate-chip-in flex items-start gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 ${
                      entry.status === "demo" ? "opacity-80" : ""
                    }`}
                  >
                    <span className={`mt-0.5 shrink-0 ${text[meta.color]}`}>{meta.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 font-mono text-[9px]">
                        <span className="truncate text-slate-200">{entry.perfil}</span>
                        <span className="text-slate-600">
                          {entry.tipo === "post" ? "→" : entry.tipo === "comment" ? "↳" : "♡"}
                        </span>
                        <span className="min-w-0 truncate text-neon-cyan/80">{entry.pagina}</span>
                      </div>
                      {entry.texto ? (
                        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-400">
                          {entry.texto}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5 font-mono text-[8px]">
                      <span
                        className={
                          entry.status === "ok"
                            ? "text-neon-green"
                            : entry.status === "error"
                            ? "text-neon-red"
                            : entry.status === "en_cola"
                            ? "text-neon-cyan"
                            : "text-slate-600"
                        }
                      >
                        {entry.status === "ok" ? (
                          <Check size={9} className="inline" />
                        ) : entry.status === "demo" ? (
                          "sim"
                        ) : (
                          entry.status
                        )}
                      </span>
                      <span className="text-slate-600">{entry.time}</span>
                    </div>
                  </div>
                );
              })
            )}
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
              disabled={busy || !draft.nombre_identificador || !draft.email_o_usuario || !draft.password}
              className="btn-primary"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : null} Registrar
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nombre identificador">
            <input
              value={draft.nombre_identificador}
              onChange={(event) => setDraft({ ...draft, nombre_identificador: event.target.value })}
              placeholder="cuenta-gatos-01"
              className="input-neon font-mono text-[11px]"
            />
          </Field>
          <Field label="Email o usuario de Facebook">
            <input
              value={draft.email_o_usuario}
              onChange={(event) => setDraft({ ...draft, email_o_usuario: event.target.value })}
              placeholder="usuario@mail.com"
              className="input-neon font-mono text-[11px]"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={draft.password}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
              className="input-neon font-mono text-[11px]"
            />
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
            <Chip>sin APIs oficiales</Chip>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const DEMO_PAGES: PaginaFB[] = [
  {
    id: "demo-page-1",
    id_plataforma: "vida-gatuna",
    nombre_publico: "Vida Gatuna",
    url: null,
    avatar_url: null,
    estado_conexion: "demo",
    capacidades: null,
    personaje_id: null,
  },
  {
    id: "demo-page-2",
    id_plataforma: "patitas-zona-norte",
    nombre_publico: "Patitas Zona Norte",
    url: null,
    avatar_url: null,
    estado_conexion: "demo",
    capacidades: null,
    personaje_id: null,
  },
];
