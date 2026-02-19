import React, { useCallback, useState } from "react";
import {
  getVimeoPing,
  getVimeoShowcases,
  getVimeoShowcaseVideos,
  postVimeoShowcaseVideo,
  deleteVimeoShowcaseVideo,
  getVitrineExport,
  postShowcaseImport
} from "../../api/adminVimeo";
import { useVitrinesStore } from "../../store/vitrinesStore";
import { ToolCard } from "../../components/tools/ToolCard";
import { Button, Modal, ToastContainer } from "../../components/ui";
import { useToast } from "../../hooks/useToast";

type ModalType =
  | "ping"
  | "showcases"
  | "videos"
  | "addVideo"
  | "removeVideo"
  | "export"
  | "import"
  | "embed"
  | null;

export function ToolsPage() {
  const toast = useToast();
  const vitrinesAdmin = useVitrinesStore((s) => s.admin.vitrines);
  const [modal, setModal] = useState<ModalType>(null);

  const open = (type: ModalType) => () => setModal(type);
  const close = () => setModal(null);

  return (
    <div className="page-tools">
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />
      <div className="card card-padding">
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Ferramentas</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Ferramentas Vimeo e vitrines. Use os cards para abrir cada ação.
        </p>

        <section style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Vimeo</h3>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            <ToolCard title="Testar conexão Vimeo" description="Verifica se a conta Vimeo está conectada." onClick={open("ping")} />
            <ToolCard title="Listar vitrines (Showcases)" description="Lista showcases do Vimeo." onClick={open("showcases")} />
            <ToolCard title="Listar vídeos da vitrine" description="Lista vídeos de um showcase por ID." onClick={open("videos")} />
            <ToolCard title="Adicionar vídeo à vitrine" description="Adiciona um vídeo a um showcase pelo ID." onClick={open("addVideo")} />
            <ToolCard title="Remover vídeo da vitrine" description="Remove um vídeo de um showcase." onClick={open("removeVideo")} />
            <ToolCard title="Gerar embed" description="Gera HTML de embed dado um videoId (client-side)." onClick={open("embed")} />
          </div>
        </section>

        <section style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Vitrines (JSON)</h3>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            <ToolCard title="Exportar JSON da vitrine" description="Exporta uma vitrine (por ID) como JSON." onClick={open("export")} />
            <ToolCard title="Importar JSON" description="Cria/atualiza vitrine a partir de JSON." onClick={open("import")} />
          </div>
        </section>

        <section style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Em breve</h3>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            <ToolCard title="Webhooks Vimeo" description="Em breve." />
            <ToolCard title="Token Vimeo" description="Em breve." />
            <ToolCard title="Logs de requisição" description="Em breve." />
          </div>
        </section>
      </div>

      {modal === "ping" && <PingModal onClose={close} toast={toast} />}
      {modal === "showcases" && <ShowcasesModal onClose={close} toast={toast} />}
      {modal === "videos" && <VideosModal onClose={close} toast={toast} />}
      {modal === "addVideo" && <AddVideoModal onClose={close} toast={toast} />}
      {modal === "removeVideo" && <RemoveVideoModal onClose={close} toast={toast} />}
      {modal === "export" && <ExportModal onClose={close} toast={toast} vitrines={vitrinesAdmin} />}
      {modal === "import" && <ImportModal onClose={close} toast={toast} />}
      {modal === "embed" && <EmbedModal onClose={close} />}
    </div>
  );
}

function ResultBlock({
  result,
  errorStatus,
  toast
}: {
  result: unknown;
  errorStatus?: number;
  toast: ReturnType<typeof useToast>;
}) {
  const json =
    result != null
      ? JSON.stringify(errorStatus != null ? { status: errorStatus, ...(typeof result === "object" && result ? result : { message: result }) } : result, null, 2)
      : errorStatus != null
        ? JSON.stringify({ status: errorStatus }, null, 2)
        : "";
  const copy = () => {
    if (json) {
      navigator.clipboard.writeText(json);
      toast.success("Copiado para a área de transferência.");
    }
  };
  return (
    <div className="mt-md">
      <div className="flex items-center gap-sm" style={{ marginBottom: 6 }}>
        <span className="field-label">Resultado</span>
        {json && (
          <Button variant="secondary" onClick={copy} type="button">
            Copiar resultado
          </Button>
        )}
      </div>
      {errorStatus != null && (
        <p className="muted" style={{ marginBottom: 8 }}>
          HTTP status: {errorStatus}
        </p>
      )}
      {json && (
        <textarea
          readOnly
          rows={8}
          className="input"
          value={json}
          style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: 12 }}
        />
      )}
    </div>
  );
}

function PingModal({ onClose, toast }: { onClose: () => void; toast: ReturnType<typeof useToast> }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined);

  const run = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setErrorStatus(undefined);
    try {
      const res = await getVimeoPing();
      setResult(res);
      if (res.ok) toast.success(res.message);
      else toast.warning(res.message);
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number };
      setErrorStatus(err?.status);
      setResult({ error: err?.message ?? "Erro ao testar conexão." });
      toast.error(err?.message ?? "Erro ao testar conexão.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return (
    <Modal open title="Testar conexão Vimeo" onClose={onClose} footer={<Button onClick={onClose}>Fechar</Button>}>
      <div>
        <Button onClick={run} disabled={loading}>{loading ? "A executar…" : "Executar"}</Button>
        {(result != null || errorStatus != null) && (
          <ResultBlock result={result} errorStatus={errorStatus} toast={toast} />
        )}
      </div>
    </Modal>
  );
}

function ShowcasesModal({ onClose, toast }: { onClose: () => void; toast: ReturnType<typeof useToast> }) {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Array<{ id: string; name: string; description?: string; createdAt?: string | null }>>([]);
  const [result, setResult] = useState<unknown>(null);
  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setList([]);
    setResult(null);
    setErrorStatus(undefined);
    try {
      const res = await getVimeoShowcases();
      setList(res.showcases || []);
      setResult(res);
      toast.success(`${(res.showcases || []).length} showcase(s) listados.`);
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number };
      setErrorStatus(err?.status);
      setResult({ error: err?.message ?? "Erro ao listar." });
      toast.error(err?.message ?? "Erro ao listar.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return (
    <Modal open title="Listar vitrines (Showcases)" onClose={onClose} footer={<Button onClick={onClose}>Fechar</Button>}>
      <div>
        <Button onClick={load} disabled={loading}>{loading ? "A carregar…" : "Carregar"}</Button>
        {list.length > 0 && (
          <div className="mt-md" style={{ maxHeight: 320, overflow: "auto" }}>
            <table className="table">
              <thead>
                <tr><th>ID</th><th>Nome</th><th>Criado</th></tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id}><td><code>{s.id}</code></td><td>{s.name}</td><td>{s.createdAt || "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(result != null || errorStatus != null) && (
          <ResultBlock result={result} errorStatus={errorStatus} toast={toast} />
        )}
      </div>
    </Modal>
  );
}

function VideosModal({ onClose, toast }: { onClose: () => void; toast: ReturnType<typeof useToast> }) {
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<Array<{ id: string; title: string }>>([]);
  const [result, setResult] = useState<unknown>(null);
  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined);

  const load = useCallback(async () => {
    const showcaseId = id.trim();
    if (!showcaseId) {
      toast.warning("Indique o ID do showcase.");
      return;
    }
    setLoading(true);
    setVideos([]);
    setResult(null);
    setErrorStatus(undefined);
    try {
      const res = await getVimeoShowcaseVideos(showcaseId);
      setVideos(res.videos || []);
      setResult(res);
      toast.success(`${(res.videos || []).length} vídeo(s).`);
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number };
      setErrorStatus(err?.status);
      setResult({ error: err?.message ?? "Erro ao listar vídeos." });
      toast.error(err?.message ?? "Erro ao listar vídeos.");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  return (
    <Modal open title="Listar vídeos da vitrine" onClose={onClose} footer={<Button onClick={onClose}>Fechar</Button>}>
      <div>
        <label className="field">
          <span className="field-label">ID do showcase (Vimeo)</span>
          <input className="input" value={id} onChange={(e) => setId(e.target.value)} placeholder="ex: 12345" />
        </label>
        <Button onClick={load} disabled={loading} className="mt-sm">{loading ? "A carregar…" : "Carregar"}</Button>
        {videos.length > 0 && (
          <div className="mt-md" style={{ maxHeight: 280, overflow: "auto" }}>
            <table className="table">
              <thead><tr><th>ID</th><th>Título</th></tr></thead>
              <tbody>
                {videos.map((v) => (
                  <tr key={v.id}><td><code>{v.id}</code></td><td>{v.title}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(result != null || errorStatus != null) && (
          <ResultBlock result={result} errorStatus={errorStatus} toast={toast} />
        )}
      </div>
    </Modal>
  );
}

function AddVideoModal({ onClose, toast }: { onClose: () => void; toast: ReturnType<typeof useToast> }) {
  const [showcaseId, setShowcaseId] = useState("");
  const [videoIdOrUri, setVideoIdOrUri] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const sid = showcaseId.trim();
    const vid = videoIdOrUri.trim();
    if (!sid || !vid) {
      toast.warning("Preencha showcase ID e vídeo (ID ou URL).");
      return;
    }
    setLoading(true);
    try {
      await postVimeoShowcaseVideo(sid, vid);
      toast.success("Vídeo adicionado.");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally {
      setLoading(false);
    }
  }, [showcaseId, videoIdOrUri, toast, onClose]);

  return (
    <Modal open title="Adicionar vídeo à vitrine" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label className="field-label">ID do showcase (Vimeo)</label>
          <input className="input" value={showcaseId} onChange={(e) => setShowcaseId(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field-label">ID do vídeo ou URL Vimeo</label>
          <input className="input" value={videoIdOrUri} onChange={(e) => setVideoIdOrUri(e.target.value)} placeholder="123456 ou https://vimeo.com/123456" required />
        </div>
        <div className="modal-footer" style={{ marginTop: 16 }}>
          <Button type="submit" disabled={loading}>{loading ? "A adicionar…" : "Adicionar"}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}

function RemoveVideoModal({ onClose, toast }: { onClose: () => void; toast: ReturnType<typeof useToast> }) {
  const [showcaseId, setShowcaseId] = useState("");
  const [videoId, setVideoId] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const sid = showcaseId.trim();
    const vid = videoId.trim();
    if (!sid || !vid) {
      toast.warning("Preencha showcase ID e vídeo ID.");
      return;
    }
    setLoading(true);
    try {
      await deleteVimeoShowcaseVideo(sid, vid);
      toast.success("Vídeo removido.");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover.");
    } finally {
      setLoading(false);
    }
  }, [showcaseId, videoId, toast, onClose]);

  return (
    <Modal open title="Remover vídeo da vitrine" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label className="field-label">ID do showcase (Vimeo)</label>
          <input className="input" value={showcaseId} onChange={(e) => setShowcaseId(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field-label">ID do vídeo (Vimeo)</label>
          <input className="input" value={videoId} onChange={(e) => setVideoId(e.target.value)} required />
        </div>
        <div className="modal-footer" style={{ marginTop: 16 }}>
          <Button type="submit" disabled={loading} variant="danger">{loading ? "A remover…" : "Remover"}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}

function ExportModal({
  onClose,
  toast,
  vitrines
}: {
  onClose: () => void;
  toast: ReturnType<typeof useToast>;
  vitrines: Array<{ id: string; title: string }>;
}) {
  const [vitrineId, setVitrineId] = useState("");
  const [idInput, setIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [json, setJson] = useState("");

  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined);

  const run = useCallback(async () => {
    const id = (vitrines.length > 0 ? vitrineId : idInput).trim();
    if (!id) {
      toast.warning("Indique o ID da vitrine.");
      return;
    }
    setLoading(true);
    setJson("");
    setErrorStatus(undefined);
    try {
      const data = await getVitrineExport(id);
      setJson(JSON.stringify(data, null, 2));
      toast.success("JSON exportado.");
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number };
      setErrorStatus(err?.status);
      setJson(JSON.stringify({ error: err?.message ?? "Erro ao exportar.", status: err?.status }, null, 2));
      toast.error(err?.message ?? "Erro ao exportar.");
    } finally {
      setLoading(false);
    }
  }, [vitrineId, idInput, vitrines.length, toast]);

  const copy = () => {
    if (json) {
      navigator.clipboard.writeText(json);
      toast.success("Copiado para a área de transferência.");
    }
  };

  return (
    <Modal open title="Exportar JSON da vitrine" onClose={onClose} footer={<Button onClick={onClose}>Fechar</Button>}>
      <div>
        {vitrines.length > 0 ? (
          <div className="field">
            <label className="field-label">Vitrine</label>
            <select className="input" value={vitrineId} onChange={(e) => setVitrineId(e.target.value)}>
              <option value="">— Selecionar —</option>
              {vitrines.map((v) => (
                <option key={v.id} value={v.id}>{v.title} ({v.id})</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="field">
            <label className="field-label">ID da vitrine</label>
            <input className="input" value={idInput} onChange={(e) => setIdInput(e.target.value)} placeholder="ex: clxx..." />
          </div>
        )}
        <Button onClick={run} disabled={loading}>{loading ? "A exportar…" : "Exportar"}</Button>
        {json && (
          <div className="mt-md">
            <span className="field-label">Resultado</span>
            {errorStatus != null && (
              <p className="muted" style={{ marginBottom: 8 }}>HTTP status: {errorStatus}</p>
            )}
            <Button variant="secondary" onClick={copy}>Copiar resultado</Button>
            <textarea readOnly rows={12} className="input mt-sm" value={json} style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: 12 }} />
          </div>
        )}
      </div>
    </Modal>
  );
}

function ImportModal({ onClose, toast }: { onClose: () => void; toast: ReturnType<typeof useToast> }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const t = text.trim();
      if (!t) {
        toast.warning("Cole o JSON da vitrine.");
        return;
      }
      let json: unknown;
      try {
        json = JSON.parse(t);
      } catch {
        toast.error("JSON inválido.");
        return;
      }
      setLoading(true);
      try {
        const res = await postShowcaseImport(json);
        toast.success(`Vitrine importada: ${res.vitrineId}`);
        onClose();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erro ao importar.");
      } finally {
        setLoading(false);
      }
    },
    [text, toast, onClose]
  );

  return (
    <Modal open title="Importar JSON" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label className="field-label">JSON da vitrine (objeto com title, opcionalmente id, description, status, videos)</label>
          <textarea className="input" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder='{"title":"Minha vitrine","videos":[]}' style={{ width: "100%", boxSizing: "border-box" }} />
        </div>
        <div className="modal-footer" style={{ marginTop: 16 }}>
          <Button type="submit" disabled={loading}>{loading ? "A importar…" : "Importar"}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}

function EmbedModal({ onClose }: { onClose: () => void }) {
  const [videoId, setVideoId] = useState("");
  const [embed, setEmbed] = useState("");

  const generate = () => {
    const id = videoId.trim().replace(/[^0-9]/g, "") || videoId.trim();
    if (!id) {
      setEmbed("");
      return;
    }
    const url = `https://player.vimeo.com/video/${id}`;
    const html = `<iframe src="${url}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    setEmbed(html);
  };

  return (
    <Modal open title="Gerar embed" onClose={onClose} footer={<Button onClick={onClose}>Fechar</Button>}>
      <div>
        <div className="field">
          <label className="field-label">ID do vídeo Vimeo</label>
          <input className="input" value={videoId} onChange={(e) => setVideoId(e.target.value)} placeholder="123456" />
        </div>
        <Button onClick={generate}>Gerar</Button>
        {embed && (
          <div className="mt-md">
            <label className="field-label">HTML</label>
            <textarea readOnly rows={4} className="input" value={embed} style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
        )}
      </div>
    </Modal>
  );
}
