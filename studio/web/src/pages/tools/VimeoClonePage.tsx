import React, { useCallback, useEffect, useState } from "react";
import {
  getProfiles,
  postProfile,
  deleteProfile,
  postProfileSync,
  getShowcases,
  getShowcaseVideos,
  postImportToStudio,
  getBestThumbUrl,
  type VimeoProfilePublic,
  type ShowcaseItem,
  type VideoItem
} from "../../api/adminVimeoClone";
import { Button, Modal, ToastContainer } from "../../components/ui";
import { useToast } from "../../hooks/useToast";

export function VimeoClonePage() {
  const toast = useToast();
  const [profiles, setProfiles] = useState<VimeoProfilePublic[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [modalAddProfile, setModalAddProfile] = useState(false);
  const [modalVideos, setModalVideos] = useState<{ profileId: string; showcaseId: string; name: string } | null>(null);

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const res = await getProfiles();
      setProfiles(res.profiles ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar perfis.");
    } finally {
      setLoadingProfiles(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  return (
    <div className="page-tools">
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />
      <div className="card card-padding">
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Vimeo Clone</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Clone multi-perfil: adicione perfis Vimeo, colete vitrines e vídeos localmente e importe para o Studio.
        </p>

        <section style={{ marginBottom: 24 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Perfis Vimeo</h3>
          <Button onClick={() => setModalAddProfile(true)} className="mb-sm">
            Adicionar perfil
          </Button>
          {loadingProfiles ? (
            <p className="muted">A carregar…</p>
          ) : profiles.length === 0 ? (
            <p className="muted">Nenhum perfil. Adicione um com o token de acesso.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {profiles.map((p) => (
                <ProfileRow
                  key={p.id}
                  profile={p}
                  onSyncFull={async () => await handleSync(p.id, "full", toast, loadProfiles)}
                  onSyncIncremental={async () => await handleSync(p.id, "incremental", toast, loadProfiles)}
                  onRemove={async () => {
                    try {
                      await deleteProfile(p.id);
                      toast.success("Perfil removido.");
                      loadProfiles();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Erro ao remover.");
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Buscar vitrines por perfil</h3>
          {profiles.length > 0 ? (
            <ShowcasesSection profiles={profiles} onOpenVideos={(profileId, showcaseId, name) => setModalVideos({ profileId, showcaseId, name })} />
          ) : (
            <p className="muted">Adicione um perfil para listar vitrines.</p>
          )}
        </section>
      </div>

      {modalAddProfile && (
        <AddProfileModal
          onClose={() => setModalAddProfile(false)}
          onSuccess={() => {
            setModalAddProfile(false);
            loadProfiles();
            toast.success("Perfil adicionado.");
          }}
          toast={toast}
        />
      )}
      {modalVideos && (
        <VideosModal
          profileId={modalVideos.profileId}
          showcaseId={modalVideos.showcaseId}
          name={modalVideos.name}
          onClose={() => setModalVideos(null)}
          toast={toast}
        />
      )}
    </div>
  );
}

async function handleSync(
  profileId: string,
  mode: "full" | "incremental",
  toast: ReturnType<typeof useToast>,
  loadProfiles: () => void
) {
  try {
    const res = await postProfileSync(profileId, mode);
    toast.success(
      `Sincronização: ${res.showcasesUpserted} vitrines, ${res.videosUpserted} vídeos, ${res.linksUpserted} vínculos.`
    );
    loadProfiles();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Erro na sincronização.");
  }
}

function ProfileRow({
  profile,
  onSyncFull,
  onSyncIncremental,
  onRemove
}: {
  profile: VimeoProfilePublic;
  onSyncFull: () => Promise<void>;
  onSyncIncremental: () => Promise<void>;
  onRemove: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const label = profile.label || profile.name || profile.vimeoUserId;
  const status = profile.lastSyncStatus === "ok" ? "ok" : profile.lastSyncStatus === "error" ? "erro" : null;

  const runSync = (mode: "full" | "incremental") => async () => {
    setSyncing(true);
    try {
      if (mode === "full") await onSyncFull();
      else await onSyncIncremental();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: 12,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8
      }}
    >
      <div style={{ flex: "1 1 200px" }}>
        <strong>{label}</strong>
        <span className="muted" style={{ marginLeft: 8, fontSize: 13 }}>
          {profile.vimeoUserId}
        </span>
        {profile.lastSyncAt && (
          <span className="muted" style={{ display: "block", fontSize: 12 }}>
            Última sync: {new Date(profile.lastSyncAt).toLocaleString()}
            {status && ` (${status})`}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button size="sm" onClick={runSync("full")} disabled={syncing}>
          {syncing ? "A sincronizar…" : "Coletar tudo"}
        </Button>
        <Button size="sm" variant="secondary" onClick={runSync("incremental")} disabled={syncing}>
          Atualizar
        </Button>
        <Button size="sm" variant="danger" onClick={onRemove} disabled={removing}>
          Remover
        </Button>
      </div>
    </div>
  );
}

function AddProfileModal({
  onClose,
  onSuccess,
  toast
}: {
  onClose: () => void;
  onSuccess: () => void;
  toast: ReturnType<typeof useToast>;
}) {
  const [accessToken, setAccessToken] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = accessToken.trim();
    if (!token || token.length < 20) {
      toast.warning("Token é obrigatório (mín. 20 caracteres).");
      return;
    }
    setLoading(true);
    try {
      await postProfile(token, label.trim() || undefined);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar perfil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      title="Adicionar perfil Vimeo"
      onClose={onClose}
      footer={
        <>
          <Button onClick={submit} disabled={loading}>
            {loading ? "A guardar…" : "Adicionar"}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="field">
          <label className="field-label">Access Token (apenas no backend, nunca exposto no frontend)</label>
          <input
            type="password"
            className="input"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="Token de acesso Vimeo"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label className="field-label">Label (opcional)</label>
          <input
            className="input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ex: Conta institucional"
          />
        </div>
      </form>
    </Modal>
  );
}

function ShowcasesSection({
  profiles,
  onOpenVideos
}: {
  profiles: VimeoProfilePublic[];
  onOpenVideos: (profileId: string, showcaseId: string, name: string) => void;
}) {
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    items: ShowcaseItem[];
    total: number;
    page: number;
    perPage: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setProfileId((prev) => (profiles.some((p) => p.id === prev) ? prev : profiles[0]?.id ?? ""));
  }, [profiles]);

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const res = await getShowcases(profileId, { q: q.trim() || undefined, page, perPage: 12 });
      setData(res);
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [profileId, q, page]);

  useEffect(() => {
    if (profileId) load();
  }, [profileId, page, load]);

  const search = () => {
    setPage(1);
    load();
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <select
          className="input"
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          style={{ width: 220 }}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label || p.name || p.vimeoUserId}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar por nome/descrição/ID"
          style={{ width: 220 }}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <Button onClick={search} disabled={loading}>
          Buscar
        </Button>
      </div>
      {loading && !data ? (
        <p className="muted">A carregar…</p>
      ) : data && data.items.length > 0 ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12
            }}
          >
            {data.items.map((s) => (
              <ShowcaseCard
                key={s.id}
                profileId={profileId}
                showcase={s}
                onViewVideos={() => onOpenVideos(profileId, s.id, s.name ?? s.vimeoId)}
              />
            ))}
          </div>
          {data.total > data.perPage && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="muted">
                Página {data.page} de {Math.ceil(data.total / data.perPage)}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= Math.ceil(data.total / data.perPage)}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      ) : data ? (
        <p className="muted">Nenhuma vitrine encontrada.</p>
      ) : null}
    </div>
  );
}

function ShowcaseCard({
  profileId,
  showcase,
  onViewVideos
}: {
  profileId: string;
  showcase: ShowcaseItem;
  onViewVideos: () => void;
}) {
  const [importing, setImporting] = useState(false);
  const toast = useToast();
  const thumb = getBestThumbUrl(showcase.pictures);

  const handleImport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setImporting(true);
    try {
      const res = await postImportToStudio(showcase.id);
      toast.success(res.message + " Vitrine ID: " + res.vitrineId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {thumb ? (
        <img src={thumb} alt="" style={{ width: "100%", height: 120, objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: 120, background: "var(--color-bg-muted, #eee)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="muted">Sem miniatura</span>
        </div>
      )}
      <div style={{ padding: 10 }}>
        <strong style={{ display: "block", marginBottom: 4 }}>{showcase.name ?? showcase.vimeoId}</strong>
        <span className="muted" style={{ fontSize: 12 }}>
          ID: {showcase.vimeoId} · {showcase.totalVideos ?? 0} vídeos
        </span>
        {showcase.modifiedTime && (
          <span className="muted" style={{ display: "block", fontSize: 11 }}>
            {new Date(showcase.modifiedTime).toLocaleDateString()}
          </span>
        )}
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button size="sm" onClick={onViewVideos}>
            Ver vídeos
          </Button>
          <Button size="sm" variant="secondary" onClick={handleImport} disabled={importing}>
            {importing ? "A importar…" : "Importar para Studio"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function VideosModal({
  profileId,
  showcaseId,
  name,
  onClose,
  toast
}: {
  profileId: string;
  showcaseId: string;
  name: string;
  onClose: () => void;
  toast: ReturnType<typeof useToast>;
}) {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 20;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getShowcaseVideos(profileId, showcaseId, { page, perPage })
      .then((res) => {
        if (!cancelled) {
          setItems(res.items);
          setTotal(res.total);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId, showcaseId, page, perPage]);

  const copyLink = (link: string | null) => {
    if (link) {
      navigator.clipboard.writeText(link);
      toast.success("Link copiado.");
    }
  };
  const copyEmbed = (html: string | null) => {
    if (html) {
      navigator.clipboard.writeText(html);
      toast.success("Embed copiado.");
    }
  };

  return (
    <Modal
      open
      title={`Vídeos: ${name}`}
      onClose={onClose}
      footer={<Button onClick={onClose}>Fechar</Button>}
      className="modal-panel-large"
    >
      {loading ? (
        <p className="muted">A carregar…</p>
      ) : (
        <div style={{ maxHeight: 400, overflow: "auto" }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {items.map((v) => {
              const thumb = getBestThumbUrl(v.pictures);
              return (
                <li
                  key={v.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--color-border, #eee)"
                  }}
                >
                  {thumb ? (
                    <img src={thumb} alt="" style={{ width: 120, height: 68, objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 120, height: 68, background: "var(--color-bg-muted)", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{v.name ?? v.vimeoId}</strong>
                    {v.duration != null && (
                      <span className="muted" style={{ marginLeft: 8 }}>
                        {Math.floor(v.duration / 60)}:{String(v.duration % 60).padStart(2, "0")}
                      </span>
                    )}
                    {v.link && (
                      <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                        <a href={v.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
                          {v.link}
                        </a>
                        <Button size="sm" variant="secondary" onClick={() => copyLink(v.link)}>
                          Copiar link
                        </Button>
                      </div>
                    )}
                    {v.embedHtml && (
                      <div style={{ marginTop: 4 }}>
                        <Button size="sm" variant="ghost" onClick={() => copyEmbed(v.embedHtml)}>
                          Copiar embed
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {total > perPage && (
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <span className="muted">
                {page} / {Math.ceil(total / perPage)}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= Math.ceil(total / perPage)}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
