import { getAccessToken, googleSignIn } from './googleAuth';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export interface PickedGoogleFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  iconUrl?: string;
  sizeBytes?: number;
  lastEditedUtc?: number;
  description?: string;
}

let isGapiLoading = false;
let gapiLoadPromise: Promise<void> | null = null;

export const loadGapiPicker = (): Promise<void> => {
  if (typeof window !== 'undefined' && window.google?.picker) {
    return Promise.resolve();
  }

  if (gapiLoadPromise) {
    return gapiLoadPromise;
  }

  gapiLoadPromise = new Promise((resolve, reject) => {
    const checkGapi = () => {
      if (window.gapi) {
        window.gapi.load('picker', {
          callback: () => resolve(),
          onerror: () => reject(new Error('Falha ao carregar Google Picker API')),
          timeout: 10000,
          ontimeout: () => reject(new Error('Timeout ao carregar Google Picker API'))
        });
      } else {
        // dynamically inject script if missing
        const existingScript = document.getElementById('google-api-script');
        if (!existingScript) {
          const script = document.createElement('script');
          script.id = 'google-api-script';
          script.src = 'https://apis.google.com/js/api.js';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            window.gapi.load('picker', {
              callback: () => resolve(),
              onerror: () => reject(new Error('Falha ao carregar biblioteca Picker'))
            });
          };
          script.onerror = () => reject(new Error('Erro ao carregar script do Google'));
          document.body.appendChild(script);
        } else {
          setTimeout(checkGapi, 200);
        }
      }
    };

    checkGapi();
  });

  return gapiLoadPromise;
};

export interface OpenPickerOptions {
  viewType?: 'ALL' | 'SPREADSHEETS' | 'DOCS' | 'PDFS' | 'IMAGES';
  title?: string;
  allowMultiSelect?: boolean;
  onPick: (files: PickedGoogleFile[]) => void;
  onCancel?: () => void;
}

export const openGooglePicker = async (options: OpenPickerOptions): Promise<void> => {
  let token = await getAccessToken();

  if (!token) {
    const authResult = await googleSignIn();
    if (!authResult) {
      throw new Error('Autenticação Google necessária para abrir o Google Drive.');
    }
    token = authResult.accessToken;
  }

  await loadGapiPicker();

  if (!window.google?.picker) {
    throw new Error('Google Picker não está disponível no navegador.');
  }

  const pickerOrigin =
    window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
      ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
      : window.location.origin;

  const builder = new window.google.picker.PickerBuilder();

  // Configure views
  let view;
  if (options.viewType === 'SPREADSHEETS') {
    view = new window.google.picker.DocsView(window.google.picker.ViewId.SPREADSHEETS);
  } else if (options.viewType === 'DOCS') {
    view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCUMENTS);
  } else if (options.viewType === 'PDFS') {
    view = new window.google.picker.DocsView(window.google.picker.ViewId.PDFS);
  } else if (options.viewType === 'IMAGES') {
    view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS_IMAGES);
  } else {
    view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
  }

  view.setIncludeFolders(true);
  builder.addView(view);

  if (options.title) {
    builder.setTitle(options.title);
  }

  if (options.allowMultiSelect) {
    builder.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
  }

  builder
    .setOAuthToken(token)
    .setOrigin(pickerOrigin)
    .setCallback((data: any) => {
      if (data.action === window.google.picker.Action.PICKED) {
        const docs = data[window.google.picker.Response.DOCUMENTS] || [];
        const pickedFiles: PickedGoogleFile[] = docs.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          mimeType: doc.mimeType,
          url: doc.url,
          iconUrl: doc.iconUrl,
          sizeBytes: doc.sizeBytes,
          lastEditedUtc: doc.lastEditedUtc,
          description: doc.description
        }));
        options.onPick(pickedFiles);
      } else if (data.action === window.google.picker.Action.CANCEL) {
        if (options.onCancel) options.onCancel();
      }
    });

  const picker = builder.build();
  picker.setVisible(true);
};

export const fetchGoogleDriveFileBlob = async (fileId: string, mimeType?: string): Promise<Blob> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Usuário não autenticado no Google');
  }

  // If it's a Google Spreadsheet, export it as XLSX
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
    const res = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Erro ao exportar planilha do Google Drive: ${res.statusText}`);
    return await res.blob();
  }

  // Standard binary file download
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Erro ao baixar arquivo do Google Drive: ${res.statusText}`);
  return await res.blob();
};
