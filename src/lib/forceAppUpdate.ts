/**
 * Limpa todos os caches do navegador (Cache Storage + Service Workers)
 * e recarrega a página com cache-busting para forçar a versão mais nova.
 *
 * Usado pelo botão "Atualizar app" da Home para resolver PWA com tela
 * desatualizada após um deploy.
 */
export async function forceAppUpdate(): Promise<void> {
  try {
    // 1. Apaga todos os caches do Cache Storage (Workbox, runtime, etc.)
    if (typeof caches !== "undefined") {
      const cacheNames = await caches.keys();
      await Promise.allSettled(cacheNames.map((name) => caches.delete(name)));
    }

    // 2. Desregistra Service Workers do app (mantém o messaging SW intacto:
    // só desregistramos workers cujo script NÃO contém "firebase-messaging").
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(
        registrations.map(async (reg) => {
          const scriptURL = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
          if (scriptURL.includes("firebase-messaging")) return;
          await reg.unregister();
        }),
      );
    }

    // 3. Limpa storages temporários (mantém localStorage com sessão/filtros).
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  } finally {
    // 4. Recarrega forçando bypass do HTTP cache via querystring única.
    const url = new URL(window.location.href);
    url.searchParams.set("_r", Date.now().toString(36));
    window.location.replace(url.toString());
  }
}