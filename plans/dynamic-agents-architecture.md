# Plano de Migração: Plataforma de Agentes Dinâmicos de Extração

## 1. Visão Geral e Objetivo
O objetivo desta refatoração é evoluir a arquitetura do Lyx Contract Intelligence de um modelo baseado em "agentes estáticos" (arquivos de código hardcoded) para uma **"Plataforma de Agentes Dinâmicos"**. 

Com esta mudança, administradores poderão criar, editar e excluir tipos de extração de documentos diretamente pela interface de usuário (UI), sem necessidade de alterar o código-fonte, recompilar ou fazer deploy da aplicação.

## 2. Nova Estrutura de Dados (Configuração do Agente)
O armazenamento (atualmente em `data/custom-prompts.json`, com fácil migração para o banco de dados no futuro) precisará evoluir de um simples dicionário de strings para um objeto de configuração completo.

**Estrutura Proposta (`data/agent-configs.json` ou Tabela no BD):**
```json
{
  "cnh-agent": {
    "name": "CNH",
    "description": "Extração de dados da Carteira Nacional de Habilitação",
    "prompt": "Extraia dados pessoais de uma CNH brasileira...",
    "model": "google_flash",
    "schema": [
      { "name": "nome", "type": "string", "description": "Nome completo do titular" },
      { "name": "cpf", "type": "string", "description": "CPF com 11 dígitos" }
    ],
    "isActive": true
  }
}
```
*Nota: O schema será definido como um array de campos para facilitar a edição na UI, que será convertido em um Zod Schema em tempo de execução.*

## 3. Mudanças no Core da IA (`src/ai`)

### 3.1. Criação de um Construtor Dinâmico de Schema
Precisaremos de uma função utilitária que leia a configuração `schema` do JSON e gere um objeto `z.object(...)` dinâmico do Zod.
- Exemplo: Converter a definição `{ name: "cpf", type: "string" }` em `z.string().describe("...")`.

### 3.2. Refatoração do `runAgent.ts`
- O `runAgent` passará a aceitar uma configuração completa (Prompt + Zod Schema Dinâmico) em vez de depender de tipos estáticos pré-compilados.
- A tipagem de retorno passará a ser mais genérica (`Record<string, any>`) para os agentes dinâmicos, mantendo o parse seguro do JSON retornado pela LLM.

### 3.3. Refatoração do `contractOrchestrator.ts`
- **Remoção do Mapa Estático:** O objeto constante `EXTRACTION_AGENTS` será substituído por uma consulta às configurações dinâmicas.
- **Roteamento Dinâmico:** Quando um documento chegar (ex: com a tag `novo-documento`), o orquestrador buscará a configuração `novo-documento-agent`. Se existir, ele constrói o schema, injeta o prompt e executa o `runAgent`.
- **Validações Específicas (Fase 2 e 3):** As regras de validação (como `compareFinancials` e `validatePlanta`) que dependem de campos específicos (ex: `fluxoData.output.financeiro`) precisarão de uma camada de adaptação ou validação de tipo em tempo de execução para garantir que o agente dinâmico retornou a estrutura esperada antes de prosseguir.

## 4. Mudanças no Frontend (Área Administrativa)

### 4.1. Nova Interface de Edição (`/prompts` ou `/agentes`)
A tela de edição precisará ser expandida para incluir:
1.  **Metadados:** Nome legível, Identificador (slug), Descrição.
2.  **Configuração de LLM:** Seleção do modelo (Flash, Pro, etc).
3.  **Prompt do Sistema:** Textarea atual para as instruções.
4.  **Construtor de Schema (Schema Builder):** Uma interface iterativa onde o usuário pode adicionar/remover campos esperados na extração:
    - Nome do Campo (ex: `valor_total`)
    - Tipo de Dado (String, Number, Boolean, Array, Object)
    - Descrição/Instrução específica para aquele campo.

### 4.2. Ações de Servidor (CRUD completo)
- O arquivo `actions.ts` será atualizado para lidar com a nova estrutura de dados (Criar, Ler, Atualizar e Deletar configurações completas de agentes).

## 5. Estratégia de Migração (Passo a Passo)

Para garantir que o sistema não quebre durante a transição, a implementação deve ser feita em fases:

1.  **Fase 1: Preparação da Estrutura**
    - Criar as funções de geração dinâmica de schema Zod.
    - Criar a nova estrutura de armazenamento (`agent-configs.json`).
    - Migrar *manualmente* as configurações estáticas atuais (CNH, RG, Fluxo, etc.) para este novo formato JSON como dados iniciais (Seed).
2.  **Fase 2: Motor Dinâmico**
    - Atualizar o `runAgent` para suportar as configurações dinâmicas.
    - Atualizar o `contractOrchestrator` para tentar carregar o agente dinâmico primeiro. Se falhar (por não existir configuração), ele usa a versão estática como fallback (backward compatibility).
3.  **Fase 3: Interface Administrativa**
    - Construir o Schema Builder e a nova UI de gerenciamento de agentes.
    - Conectar a UI com as novas Server Actions.
4.  **Fase 4: Limpeza (Opcional)**
    - Uma vez que todos os agentes estejam funcionando via configuração dinâmica e a estabilidade for confirmada, remover as pastas estáticas individuais (`src/ai/agents/cnh-agent`, etc.) para limpar o codebase.

## 6. Riscos e Mitigações
- **Perda de Tipagem Estrita:** Códigos que consomem as extrações (como o relatório final) perderão o autocomplete perfeito do TypeScript. *Mitigação:* Usar type casting ou type guards nos pontos críticos de validação cruzada.
- **Estruturas Complexas:** Alguns agentes (como Fluxo e Quadro Resumo) possuem schemas aninhados complexos (objetos dentro de arrays). O Schema Builder na UI precisará ser robusto o suficiente para suportar aninhamento, ou esses agentes específicos devem permanecer "híbridos" (schema fixo no código, prompt dinâmico) até que a UI suporte edição de schemas complexos.