import { useCallback, useEffect, useMemo, useState } from "react";
import { idbGet, idbSet, idbDel } from "@/lib/persistence/indexedDb";
import { getExcelSourceSignedUrl, type ExcelSourceKey } from "@/lib/excelSourceRemote";

export type PersistedExcelSourceKey =
  | "excel_source_admissions"
  | "excel_source_discharges"
  | "excel_source_services";

type PersistedMeta = {
  fileName?: string;
  customTitle?: string;
  updatedAt?: string; // ISO
  storageBucket?: string;
  storagePath?: string;
};

type PersistedHandlePayload = {
  handle?: any; // FileSystemFileHandle (structured clone) on supported browsers
  meta: PersistedMeta;
};

function supportsFileSystemAccessApi() {
  return typeof window !== "undefined" && typeof (window as any).showOpenFilePicker === "function";
}

export function usePersistentExcelSource(key: PersistedExcelSourceKey) {
  const [isReady, setIsReady] = useState(false);
  const [meta, setMeta] = useState<PersistedMeta>({});
  const [handle, setHandle] = useState<any>(null);

  const canPersistHandle = useMemo(() => supportsFileSystemAccessApi(), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const payload = await idbGet<PersistedHandlePayload>(key);
        if (!mounted) return;
        setHandle(payload?.handle ?? null);
        setMeta(payload?.meta ?? {});
      } finally {
        if (mounted) setIsReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [key]);

  const pick = useCallback(async () => {
    if (!canPersistHandle) {
      // Fallback: user will still be able to select, but we can't keep the real path/handle.
      // We just store the file name as a convenience.
      return { ok: false as const, reason: "no_fs_access" as const };
    }

    const picker = (window as any).showOpenFilePicker;
    const [pickedHandle] = await picker({
      multiple: false,
      types: [
        {
          description: "Excel",
          accept: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-excel": [".xls"],
          },
        },
      ],
    });

    const file = await pickedHandle.getFile();
    const payload: PersistedHandlePayload = {
      handle: pickedHandle,
      meta: { fileName: file.name, updatedAt: new Date().toISOString() },
    };

    await idbSet(key, payload);
    setHandle(pickedHandle);
    setMeta(payload.meta);

    return { ok: true as const, fileName: file.name };
  }, [canPersistHandle, key]);

  // Fallback path for browsers that don't support File System Access API.
  // We can't persist the handle, but we can remember the last selected file name.
  const setFallbackPickedFile = useCallback(
    async (fileName: string) => {
      const payload = await idbGet<PersistedHandlePayload>(key);
      const nextMeta: PersistedMeta = {
        ...(payload?.meta ?? {}),
        fileName,
        updatedAt: new Date().toISOString(),
      };

      const nextPayload: PersistedHandlePayload = {
        handle: null,
        meta: nextMeta,
      };

      await idbSet(key, nextPayload);
      setHandle(null);
      setMeta(nextMeta);
    },
    [key]
  );

  const clear = useCallback(async () => {
    await idbDel(key);
    setHandle(null);
    setMeta({});
  }, [key]);

  const setCustomTitle = useCallback(
    async (customTitle: string) => {
      const payload = await idbGet<PersistedHandlePayload>(key);
      const nextMeta: PersistedMeta = {
        ...(payload?.meta ?? {}),
        customTitle,
      };

      const nextPayload: PersistedHandlePayload = {
        handle: payload?.handle,
        meta: nextMeta,
      };

      await idbSet(key, nextPayload);
      setHandle(nextPayload.handle ?? null);
      setMeta(nextMeta);
    },
    [key]
  );

  const setStorageSource = useCallback(
    async (args: { fileName: string; storageBucket: string; storagePath: string }) => {
      const payload = await idbGet<PersistedHandlePayload>(key);
      const nextMeta: PersistedMeta = {
        ...(payload?.meta ?? {}),
        fileName: args.fileName,
        storageBucket: args.storageBucket,
        storagePath: args.storagePath,
        updatedAt: new Date().toISOString(),
      };

      const nextPayload: PersistedHandlePayload = {
        handle: payload?.handle,
        meta: nextMeta,
      };

      await idbSet(key, nextPayload);
      setHandle(nextPayload.handle ?? null);
      setMeta(nextMeta);
    },
    [key]
  );

  const readFile = useCallback(async (): Promise<File | null> => {
    // 1) Prefer local handle when available
    if (handle) {
      try {
        const file = await handle.getFile();
        return file as File;
      } catch {
        // fallthrough
      }
    }

    // 2) Fallback to remote stored copy (works across devices)
    const storagePath = meta.storagePath;
    if (!storagePath) return null;

    try {
      const signed = await getExcelSourceSignedUrl({ key: key as ExcelSourceKey, expiresIn: 60 });
      const resp = await fetch(signed.signedUrl);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      const fileName = meta.fileName || `${key}.xlsx`;
      return new File([blob], fileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    } catch {
      return null;
    }
  }, [handle, key, meta.fileName, meta.storagePath]);

  return {
    isReady,
    canPersistHandle,
    meta,
    hasSource: !!meta.fileName,
    pick,
    clear,
    setCustomTitle,
    setFallbackPickedFile,
    setStorageSource,
    readFile,
  };
}
