/**
 * Toca um sinal sonoro curto de "ação concluída com sucesso" — usado após
 * salvar, excluir, confirmar entrega, emitir nota fiscal etc. Gerado via
 * Web Audio API (dois tons ascendentes curtos), sem precisar de nenhum
 * arquivo de áudio externo.
 *
 * Falha silenciosamente se o navegador bloquear/não suportar áudio (ex.:
 * antes de qualquer interação do usuário na página), para nunca quebrar a
 * ação que o som deveria só confirmar.
 */
export function playActionCompleteSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const tocarTom = (freq: number, inicioSeg: number, duracaoSeg: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const tInicio = ctx.currentTime + inicioSeg;
      gain.gain.setValueAtTime(0, tInicio);
      gain.gain.linearRampToValueAtTime(0.18, tInicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, tInicio + duracaoSeg);

      osc.start(tInicio);
      osc.stop(tInicio + duracaoSeg + 0.02);
    };

    // Dois tons curtos ascendentes (estilo "confirmação"), ~250ms no total
    tocarTom(660, 0, 0.11);
    tocarTom(880, 0.09, 0.16);

    // Libera os recursos de áudio depois que o som termina de tocar
    setTimeout(() => { ctx.close().catch(() => {}); }, 400);
  } catch {
    // Ambientes sem suporte a áudio (ex.: SSR, alguns navegadores restritos)
    // não devem quebrar a ação que disparou o som.
  }
}
