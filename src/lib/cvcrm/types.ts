// ============================================
// CVCRM API Response Types
// ============================================

export type CvcrmUnidade = {
  empreendimento: string;
  idempreendimento_cv: number;
  etapa: string;
  bloco: string;
  unidade: string;
  andar: number;
  tipologia: string;
  area_privativa: string;
  vagas_garagem: string;
};

export type CvcrmTitular = {
  nome: string;
  idpessoa_cv: number;
  porcentagem: number;
  documento: string;
  documento_tipo: string;
  nascimento: string;
  estado_civil: string;
  email: string;
  telefone: string;
  celular: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  rg: string;
  rg_orgao_emissor: string;
  sexo: string;
  renda_familiar: string | null;
};

export type CvcrmAssociado = {
  tipo: string;
  porcentagem: string;
  idpessoa_cv: number;
  nome: string;
  documento: string;
  documento_tipo: string;
  nascimento: string;
  rg: string;
  rg_orgao_emissor: string;
  estado_civil: string;
  email: string;
  telefone: string;
  celular: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  sexo: string;
};

export type CvcrmSituacao = {
  idsituacao: number;
  situacao: string;
};

export type CvcrmContrato = {
  idcontrato: number;
  contrato: string;
  data: string;
};

export type CvcrmDocumentoItem = {
  idreservasdocumentos: number;
  nome: string;
  situacao: string;
  idtipo: number;
  tipo: string;
  idtipo_associacao: number | null;
  link: string;
  motivo_reprovacao?: string;
  descricao_motivo_reprovacao?: string | null;
};

export type CvcrmDocumentosResponse = {
  total_de_registros: number;
  dados: {
    idreserva_cv: number;
    idunidade_cv: number;
    idpessoa_cv: number;
    documentos: Record<string, CvcrmDocumentoItem[]>;
  };
};

export type CvcrmReservaData = {
  idproposta_cv: number;
  situacao: CvcrmSituacao;
  unidade: CvcrmUnidade;
  titular: CvcrmTitular;
  associados: Record<string, CvcrmAssociado>;
  corretor: Record<string, unknown>;
  condicoes: {
    valor_contrato: string;
    valor_venda: string;
    series: unknown[];
  };
  contratos: CvcrmContrato[];
  data: string;
  data_contrato: string | null;
  data_venda: string | null;
  vendida: string;
};

// A API retorna { [idreserva]: CvcrmReservaData }
export type CvcrmApiResponse = Record<string, CvcrmReservaData>;

// ============================================
// Tipos normalizados do domínio
// ============================================

export type Pessoa = {
  nome: string;
  documento: string;
  email: string;
  telefone: string;
};

export type Planta = {
  empreendimento: string;
  andar: number;
  bloco: string;
  numero: string;
};

export type ReservaProcessada = {
  reservaId: number;
  transacaoId: number;
  situacao: string;
  planta: Planta;
  pessoas: {
    titular: Pessoa;
    associados: Record<string, Pessoa>;
  };
  contratos: CvcrmContrato[];
  documentos: Record<string, CvcrmDocumentoItem[]>;
};
