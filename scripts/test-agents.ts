import "dotenv/config";
import { runCnhAgent, runRgcpfAgent, runAtoAgent, runFluxoAgent } from "../src/ai";

const TEXTO_CNH = `
CARTEIRA NACIONAL DE HABILITAÇÃO
Nacionalidade: Brasileira
Nome: JOAO CARLOS DA SILVA
Registro de Identidade: 12.345.678-9 SSP/SP
CPF: 123.456.789-00
Filiação: MARIA APARECIDA DA SILVA
          JOSE CARLOS DA SILVA
`;

const TEXTO_RG = `
REGISTRO GERAL
Nome: ANA PAULA SOUZA
RG: 45.678.901-2
CPF: 987.654.321-00
Data de Nascimento: 22/07/1990
Estado Civil: Casada
Filiação Materna: LUCIA DE SOUZA
Filiação Paterna: ANTONIO SOUZA
`;

const TEXTO_ATO = `
COMPROVANTE DE PAGAMENTO - ATO
Empreendimento: Residencial Lyx
Unidade: 203 Bloco B
Valor pago: R$ 15.750,00
Data: 10/01/2024

COMPROVANTE DE PAGAMENTO - ATO
Unidade: 203 Bloco B
Valor pago: R$ 8.500,00
Data: 10/02/2024
`;

const TEXTO_FLUXO = `
FLUXO DE PAGAMENTO
Unidade: Apto 203 - Bloco B

Parcela 01 - 10/01/2024 - Entrada        R$ 50.000,00
Parcela 02 - 10/02/2024 - Mensalidade    R$ 2.500,00
Parcela 03 - 10/03/2024 - Mensalidade    R$ 2.500,00
Parcela 04 - 10/04/2024 - Mensalidade    R$ 2.500,00

Total: R$ 57.500,00
Número de parcelas: 4
Valor da parcela mensal: R$ 2.500,00
`;

function log(label: string, result: Awaited<ReturnType<typeof runRgcpfAgent>>) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`AGENT: ${result.agent}`);
  console.log(`ok: ${result.ok} | provider: ${result.provider} | model: ${result.model} | attempts: ${result.attempts}`);
  if (result.ok) {
    console.log("data:", JSON.stringify(result.data, null, 2));
  } else {
    console.log("error:", result.error);
    console.log("raw:", result.raw?.slice(0, 300));
  }
}

async function main() {
  console.log("Running agent tests...\n");

  const [cnh, rg, ato, fluxo] = await Promise.all([
    runCnhAgent({ text: TEXTO_CNH }),
    runRgcpfAgent({ text: TEXTO_RG }),
    runAtoAgent({ text: TEXTO_ATO }),
    runFluxoAgent({ text: TEXTO_FLUXO }),
  ]);

  log("CNH", cnh);
  log("RGCPF", rg);
  log("ATO", ato);
  log("FLUXO", fluxo);

  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY:");
  console.log(`  cnh-agent:   ${cnh.ok ? "✓ OK" : "✗ FAIL"}`);
  console.log(`  rgcpf-agent: ${rg.ok ? "✓ OK" : "✗ FAIL"}`);
  console.log(`  ato-agent:   ${ato.ok ? "✓ OK" : "✗ FAIL"}`);
  console.log(`  fluxo-agent: ${fluxo.ok ? "✓ OK" : "✗ FAIL"}`);
}

main().catch(console.error);
