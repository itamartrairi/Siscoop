/**
 * Siscoop - Recebimento das propostas de compra das escolas no Google Drive
 * ==========================================================================
 *
 * COMO INSTALAR (uma vez só, com a conta Google da cooperativa):
 *  1. Acesse https://script.google.com e clique em "Novo projeto".
 *  2. Apague o conteúdo e cole este arquivo inteiro. Salve.
 *  3. (Opcional) Em PASTA_RAIZ_ID, cole o ID de uma pasta do seu Drive
 *     (o trecho da URL depois de /folders/). Se deixar vazio, o script cria
 *     a pasta "Siscoop - Propostas de Compra" na raiz do seu Drive.
 *  4. Clique em Implantar > Nova implantação > tipo "App da Web":
 *       - Executar como: Eu (a conta da cooperativa)
 *       - Quem pode acessar: Qualquer pessoa
 *     Autorize o acesso ao Drive e à Planilha quando o Google pedir.
 *  5. Copie a URL do app da Web (termina em /exec).
 *  6. No Netlify: Site configuration > Environment variables > Add variable
 *       VITE_PROPOSTAS_DRIVE_URL = (a URL copiada)
 *     e faça um novo deploy (Deploys > Trigger deploy).
 *
 * O QUE ELE FAZ:
 *  - Salva cada PDF em uma subpasta com o nome da escola.
 *  - Registra cada envio na planilha "Registro de propostas", na mesma pasta.
 *  - Não lista nem devolve arquivos: quem tem só a URL consegue enviar,
 *    mas não consegue ver nada do seu Drive.
 *
 * Ao alterar este código, publique de novo em Implantar > Gerenciar implantações
 * > editar > Nova versão (a URL continua a mesma).
 */

const PASTA_RAIZ_ID = '';
const NOME_PASTA_RAIZ = 'Siscoop - Propostas de Compra';
const TAMANHO_MAX_MB = 20;
const FUSO = 'America/Fortaleza';

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!d.arquivoBase64) throw new Error('Nenhum arquivo recebido.');

    const bytes = Utilities.base64Decode(d.arquivoBase64);
    if (bytes.length > TAMANHO_MAX_MB * 1024 * 1024) {
      throw new Error('O arquivo passa de ' + TAMANHO_MAX_MB + ' MB.');
    }
    // Todo PDF começa com "%PDF"
    if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
      throw new Error('O arquivo enviado não é um PDF válido.');
    }

    const escola = limparNome(d.escolaNome || 'Escola sem nome');
    const titulo = limparNome(d.titulo || String(d.nomeArquivo || 'Proposta').replace(/\.pdf$/i, ''));
    const quando = new Date();
    const nome = Utilities.formatDate(quando, FUSO, 'yyyy-MM-dd HH.mm') + ' - ' + titulo + '.pdf';

    const raiz = obterPastaRaiz();
    const pastaEscola = obterSubpasta(raiz, escola);
    const arquivo = pastaEscola.createFile(Utilities.newBlob(bytes, 'application/pdf', nome));
    arquivo.setDescription(
      'Escola: ' + (d.escolaNome || '') +
      '\nE-mail: ' + (d.escolaEmail || '') +
      '\nObservação: ' + (d.observacao || '')
    );

    registrarNaPlanilha(raiz, [
      Utilities.formatDate(quando, FUSO, 'dd/MM/yyyy HH:mm'),
      d.escolaNome || '',
      d.escolaEmail || '',
      d.titulo || '',
      d.observacao || '',
      arquivo.getUrl(),
      'Recebida',
    ]);

    return responder({ ok: true, nome: nome });
  } catch (err) {
    return responder({ ok: false, erro: String((err && err.message) || err) });
  }
}

function doGet() {
  return responder({ ok: true, servico: 'Siscoop - propostas de compra' });
}

function obterPastaRaiz() {
  if (PASTA_RAIZ_ID) return DriveApp.getFolderById(PASTA_RAIZ_ID);
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PASTA_RAIZ');
  if (id) {
    try {
      return DriveApp.getFolderById(id);
    } catch (e) {
      // pasta apagada: cria outra
    }
  }
  const pasta = DriveApp.createFolder(NOME_PASTA_RAIZ);
  props.setProperty('PASTA_RAIZ', pasta.getId());
  return pasta;
}

function obterSubpasta(pai, nome) {
  const existentes = pai.getFoldersByName(nome);
  return existentes.hasNext() ? existentes.next() : pai.createFolder(nome);
}

function registrarNaPlanilha(raiz, linha) {
  const props = PropertiesService.getScriptProperties();
  let planilha = null;
  const id = props.getProperty('PLANILHA');
  if (id) {
    try {
      planilha = SpreadsheetApp.openById(id);
    } catch (e) {
      planilha = null;
    }
  }
  if (!planilha) {
    planilha = SpreadsheetApp.create('Registro de propostas');
    const aba = planilha.getSheets()[0];
    aba.appendRow(['Recebida em', 'Escola', 'E-mail', 'Título', 'Observação', 'Arquivo', 'Status']);
    aba.setFrozenRows(1);
    DriveApp.getFileById(planilha.getId()).moveTo(raiz);
    props.setProperty('PLANILHA', planilha.getId());
  }
  planilha.getSheets()[0].appendRow(linha);
}

function limparNome(texto) {
  return String(texto).replace(/[\\/:*?"<>|#%]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Sem nome';
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
