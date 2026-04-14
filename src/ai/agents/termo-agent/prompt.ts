import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const TERMO_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Termo de Ciência (Awareness/Acknowledgment Term)

SCHEMA:
{
  "document_type": "TermoCiencia",
  "schema_version": "1.1",
  "output": {
    "assinado": false,
    "nome_assinante": "string",
    "data_assinatura": "YYYY-MM-DD",
    "tipo_assinatura": "manuscrita | digital_icp_brasil | gov_br | eletronica | nao_assinado"
  }
}

SPECIFIC RULES:
- Determine if the Termo de Ciência has been signed.
- assinado: true se o documento apresentar qualquer tipo de assinatura válida, incluindo: assinatura manuscrita, assinatura digital ICP-Brasil, assinatura via plataforma Gov.br (gov.br/assine), assinatura eletrônica, ou qualquer selo/carimbo de assinatura digital válida. false apenas se não houver nenhuma evidência de assinatura.
- tipo_assinatura: Identifique o tipo de assinatura presente. Use "manuscrita" para assinaturas à mão, "gov_br" para assinaturas via Gov.br, "digital_icp_brasil" para certificados ICP-Brasil, "eletronica" para outras assinaturas eletrônicas. Se não assinado, use "nao_assinado".
- nome_assinante: Name of the person who signed. If not found or not signed, return "".
- data_assinatura: Date of signature in YYYY-MM-DD format. If not found, return "".
- If the document is not a Termo de Ciência, return assinado as false, tipo_assinatura as "nao_assinado", and other fields as empty strings.
`;
