/**
 * Backfill script — roda análise de IA nas reservas já cadastradas no banco
 * que ainda não passaram pelos agentes (sem registro em reservation_audits).
 *
 * Não consulta a API do CVCRM — usa o cvcrmSnapshot já salvo no banco.
 *
 * Uso:
 *   npx tsx scripts/backfill-analysis.ts
 *   npx tsx scripts/backfill-analysis.ts --concorrencia=2
 *   npx tsx scripts/backfill-analysis.ts --limite=10
 */

import 'dotenv/config';
import { db } from '../src/db';
import { reservationsTable, reservationAuditsTable } from '../src/db/schema';
import { notInArray, eq } from 'drizzle-orm';
import { runAgentAnalysis } from '../src/services/reservation.service';
import type { ReservaProcessada } from '../src/lib/cvcrm/types';

const args = process.argv.slice(2);
const getArg = (name: string, fallback: number) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? parseInt(found.split('=')[1], 10) : fallback;
};

const CONCORRENCIA = getArg('concorrencia', 1);
const LIMITE = getArg('limite', Infinity);
const DELAY_MS = getArg('delay', 500);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('[backfill] buscando reservas sem análise...');

  // Find IDs that already have an audit entry
  const auditadas = await db
    .select({ reservationId: reservationAuditsTable.reservationId })
    .from(reservationAuditsTable);

  const auditadasIds = auditadas.map((a) => a.reservationId);

  // Fetch reservations without any audit
  const query = db.select().from(reservationsTable);
  const pendentes =
    auditadasIds.length > 0
      ? await query.where(notInArray(reservationsTable.id, auditadasIds))
      : await query;

  const total = Math.min(pendentes.length, LIMITE);

  if (total === 0) {
    console.log('[backfill] nenhuma reserva pendente de análise. encerrando.');
    return;
  }

  console.log(
    `[backfill] ${pendentes.length} reserva(s) sem análise — processando ${total} com concorrência ${CONCORRENCIA}\n`,
  );

  let ok = 0;
  let erros = 0;

  const lote = pendentes.slice(0, total);

  for (let i = 0; i < lote.length; i += CONCORRENCIA) {
    const chunk = lote.slice(i, i + CONCORRENCIA);

    await Promise.all(
      chunk.map(async (reserva) => {
        const idx = i + chunk.indexOf(reserva) + 1;
        const progresso = `[${idx}/${total}]`;

        if (!reserva.cvcrmSnapshot) {
          console.warn(
            `[backfill] ${progresso} reserva ${reserva.externalId} sem snapshot — pulando`,
          );
          erros++;
          return;
        }

        console.log(
          `[backfill] ${progresso} analisando reserva ${reserva.externalId} — ${reserva.titularNome ?? reserva.enterprise}`,
        );

        try {
          await runAgentAnalysis(
            reserva.id,
            reserva.cvcrmSnapshot as ReservaProcessada,
          );
          console.log(
            `[backfill] ${progresso} ✓ reserva ${reserva.externalId} concluída`,
          );
          ok++;
        } catch (err) {
          console.error(
            `[backfill] ${progresso} ✗ reserva ${reserva.externalId} falhou:`,
            (err as Error).message,
          );
          erros++;
        }
      }),
    );

    if (i + CONCORRENCIA < lote.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(
    `\n[backfill] concluído — ${ok} analisadas com sucesso, ${erros} erros`,
  );
}

main().catch((err) => {
  console.error('[backfill] erro fatal:', err);
  process.exit(1);
});
