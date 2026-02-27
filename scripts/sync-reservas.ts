/**
 * Script de importação de reservas do CVCRM por range de IDs.
 *
 * Como a API do CVCRM não possui endpoint de listagem funcional,
 * o script varre IDs sequencialmente a partir de um ponto inicial.
 *
 * Uso:
 *   npm run sync
 *   npm run sync -- --de=22050 --ate=22490
 *
 * Após rodar e popular o banco, este arquivo pode ser deletado.
 */

import "dotenv/config";
import { processarReserva } from "../src/services/reservation.service";

const args = process.argv.slice(2);
const getArg = (name: string) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? parseInt(found.split("=")[1], 10) : null;
};

// IDs mapeados empiricamente:
// ~22050 => final de jan/2026
// ~22490 => 27/fev/2026 (máximo atual)
const ID_DE  = getArg("de")  ?? 22050;
const ID_ATE = getArg("ate") ?? 22490;
const MAX_ERROS_CONSECUTIVOS = 5;

const CVCRM_BASE_URL = process.env.CVCRM_BASE_URL!;
const CVCRM_EMAIL    = process.env.CVCRM_EMAIL!;
const CVCRM_TOKEN    = process.env.CVCRM_TOKEN!;

async function reservaExiste(idReserva: number): Promise<boolean> {
  const res = await fetch(`${CVCRM_BASE_URL}/api/cvio/reserva/${idReserva}`, {
    headers: { email: CVCRM_EMAIL, token: CVCRM_TOKEN },
  });
  if (!res.ok) return false;
  const body = (await res.json()) as Record<string, unknown>;
  // Retorna {"codigo":400,"mensagem":"..."} para inexistente
  return !("codigo" in body);
}

async function main() {
  console.log(`[sync] varrendo IDs ${ID_DE} até ${ID_ATE}...`);

  let ok = 0;
  let pulados = 0;
  let erros = 0;
  let errosConsecutivos = 0;

  for (let id = ID_DE; id <= ID_ATE; id++) {
    if (errosConsecutivos >= MAX_ERROS_CONSECUTIVOS) {
      console.log(`[sync] ${MAX_ERROS_CONSECUTIVOS} erros consecutivos — encerrando.`);
      break;
    }

    const existe = await reservaExiste(id);
    if (!existe) {
      pulados++;
      errosConsecutivos++;
      continue;
    }

    errosConsecutivos = 0;
    const progresso = `[${id - ID_DE + 1}/${ID_ATE - ID_DE + 1}]`;

    console.log(`[sync] ${progresso} processando reserva ${id}`);
    try {
      await processarReserva(id, 0);
      ok++;
    } catch (err) {
      console.error(`[sync] ${progresso} erro reserva ${id}:`, (err as Error).message);
      erros++;
    }
  }

  console.log(`\n[sync] concluído — ${ok} importadas, ${pulados} inexistentes, ${erros} erros`);
}

main().catch((err) => {
  console.error("[sync] erro fatal:", err);
  process.exit(1);
});
