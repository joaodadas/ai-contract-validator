type PlantaData = {
  bloco: string;
  unidades: { unidade: string; [key: string]: unknown }[];
};

type ReservationPlanta = {
  bloco: string;
  numero: string;
};

export type PlantaValidationResult = {
  status: "Igual" | "Diferente" | "Atenção" | "Erro" | "Erro Script";
  mensagem: string;
  dadosComparados: {
    blocoReserva: string | null;
    unidadeReserva: string | null;
    blocoPlanta: string | null;
    unidadePlanta: string | null;
  };
};

function normalize(value: string, prefix: string): string {
  return value.toUpperCase().replace(prefix, "").trim();
}

export function validatePlanta(
  reserva: ReservationPlanta | null | undefined,
  planta: PlantaData | null | undefined
): PlantaValidationResult {
  const result: PlantaValidationResult = {
    status: "Atenção",
    mensagem: "",
    dadosComparados: {
      blocoReserva: null,
      unidadeReserva: null,
      blocoPlanta: null,
      unidadePlanta: null,
    },
  };

  if (!reserva) {
    result.status = "Erro";
    result.mensagem = "Dados de referência (Reserva) não encontrados.";
    return result;
  }

  if (!planta) {
    result.status = "Atenção";
    result.mensagem = 'O documento "Planta" não foi enviado para validação.';
    result.dadosComparados.blocoReserva = reserva.bloco;
    result.dadosComparados.unidadeReserva = reserva.numero;
    return result;
  }

  try {
    const blocoReserva = normalize(String(reserva.bloco || ""), "BLOCO");
    const unidadeReserva = normalize(String(reserva.numero || ""), "AP");
    const blocoDoc = normalize(String(planta.bloco || ""), "BLOCO");

    result.dadosComparados.blocoReserva = blocoReserva;
    result.dadosComparados.unidadeReserva = unidadeReserva;
    result.dadosComparados.blocoPlanta = blocoDoc;

    if (blocoReserva === blocoDoc) {
      const listaUnidades = planta.unidades || [];
      const unidadeEncontrada = listaUnidades.find((u) => {
        const uDoc = normalize(String(u.unidade || ""), "AP");
        return uDoc === unidadeReserva;
      });

      if (unidadeEncontrada) {
        result.dadosComparados.unidadePlanta = unidadeEncontrada.unidade;
        result.status = "Igual";
        result.mensagem = "Sucesso: Bloco e Unidade conferem.";
      } else {
        result.status = "Diferente";
        result.mensagem = `Bloco confere (${blocoDoc}), mas a unidade ${unidadeReserva} não consta na planta enviada.`;
      }
    } else {
      result.status = "Diferente";
      result.mensagem = `Blocos divergentes. Reserva: "${blocoReserva}" vs Planta: "${blocoDoc}".`;
    }
  } catch (err) {
    result.status = "Erro Script";
    result.mensagem = `Erro ao processar validação: ${err instanceof Error ? err.message : String(err)}`;
  }

  return result;
}
