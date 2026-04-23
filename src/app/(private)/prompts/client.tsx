'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AgentName } from '@/ai/_base/types';
import { DEFAULT_PROMPTS } from '@/ai/prompts-registry';
import { DEFAULT_SCHEMAS } from '@/ai/schemas-registry';
import { saveAgentAction, deleteAgentAction, syncDbToFileAction } from './actions';
import type { DynamicAgentConfig, DynamicFieldDefinition, DynamicFieldType } from '@/ai/_base/dynamic-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageContainer } from '@/components/page-container';
import { PageTitle, SectionDescription } from '@/components/typography';
import { RefreshCw, Save, Trash2, Plus, X, FileJson, CheckCircle2, AlertCircle, DatabaseZap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface PromptsClientProps {
  dynamicConfigs: Record<string, DynamicAgentConfig>;
}

const FIELD_TYPES: DynamicFieldType[] = ["string", "number", "boolean", "object", "array"];

// Helper to infer dynamic schema from JSON
function inferSchemaFromJson(json: any): DynamicFieldDefinition[] {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return [];

  return Object.entries(json).map(([key, value]) => {
    return inferField(key, value);
  });
}

function inferField(name: string, value: any): DynamicFieldDefinition {
  if (Array.isArray(value)) {
    return {
      name,
      type: 'array',
      items: value.length > 0 ? inferField('item', value[0]) : { name: 'item', type: 'string' }
    };
  }
  
  if (value !== null && typeof value === 'object') {
    return {
      name,
      type: 'object',
      fields: Object.entries(value).map(([k, v]) => inferField(k, v))
    };
  }

  if (typeof value === 'number') return { name, type: 'number' };
  if (typeof value === 'boolean') return { name, type: 'boolean' };
  
  return { name, type: 'string' };
}

function SchemaFieldEditor({ 
  field, 
  onUpdate, 
  onRemove,
  level = 0 
}: { 
  field: DynamicFieldDefinition; 
  onUpdate: (updates: Partial<DynamicFieldDefinition>) => void; 
  onRemove: () => void;
  level?: number;
}) {
  return (
    <div className={cn(
      "flex flex-col gap-2 border p-3 rounded-md bg-zinc-50 mb-3 transition-all",
      level > 0 && "ml-4 md:ml-8 border-l-2 border-l-blue-200 bg-white"
    )}>
      <div className="flex gap-2 items-start">
        <div className="flex-1 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 block uppercase font-bold tracking-tight">Nome do Campo</Label>
              <Input 
                value={field.name} 
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="ex: nome_completo"
                className="font-mono text-sm bg-white h-8"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 block uppercase font-bold tracking-tight">Tipo de Dado</Label>
              <Select value={field.type} onValueChange={(val: any) => onUpdate({ type: val })}>
                <SelectTrigger className="bg-white h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block uppercase font-bold tracking-tight">Instrução para a IA</Label>
            <Input 
              value={field.description || ''} 
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Ex: Extraia o valor sem o R$"
              className="bg-white h-8 text-xs"
            />
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-muted-foreground hover:text-destructive h-8 w-8 mt-4">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {field.type === 'object' && (
        <div className="mt-2 space-y-2">
          <div className="px-2 py-1 bg-blue-50/50 rounded-sm">
            <Label className="text-[10px] uppercase font-black text-blue-600 tracking-wider">Propriedades do Objeto</Label>
          </div>
          <div className="space-y-1">
            {(field.fields || []).map((subField, idx) => (
              <SchemaFieldEditor
                key={idx}
                field={subField}
                level={level + 1}
                onUpdate={(updates) => {
                  const newFields = [...(field.fields || [])];
                  newFields[idx] = { ...newFields[idx], ...updates };
                  onUpdate({ fields: newFields });
                }}
                onRemove={() => {
                  onUpdate({ fields: (field.fields || []).filter((_, i) => i !== idx) });
                }}
              />
            ))}
            {(field.fields || []).length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-2 italic">Objeto sem campos definidos.</p>
            )}
            <div className="flex gap-2 pt-1 px-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-7 text-[9px] font-bold uppercase bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={() => {
                  const fields = field.fields || [];
                  onUpdate({ fields: [...fields, { name: "novo_campo", type: "string" }] });
                }}
              >
                <Plus className="w-3 h-3 mr-1" /> Add Subcampo
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-7 text-[9px] font-bold uppercase bg-white border-orange-200 text-orange-600 hover:bg-orange-50"
                onClick={() => {
                  const fields = field.fields || [];
                  onUpdate({ 
                    fields: [
                      ...fields, 
                      { 
                        name: "nova_lista", 
                        type: "array", 
                        items: { name: "item", type: "object", fields: [{ name: "campo_1", type: "string" }] } 
                      }
                    ] 
                  });
                }}
              >
                <Plus className="w-3 h-3 mr-1" /> Add Lista
              </Button>
            </div>
          </div>
        </div>
      )}

      {field.type === 'array' && (
        <div className="mt-2 space-y-2">
          <div className="px-2 py-1 bg-orange-50/50 rounded-sm">
            <Label className="text-[10px] uppercase font-black text-orange-600 tracking-wider">Definição do Item da Lista</Label>
          </div>
          <div className="px-1">
            {!field.items ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full h-8 text-[10px] border-dashed border-orange-200 text-orange-600 hover:bg-orange-50 font-bold uppercase"
                onClick={() => onUpdate({ items: { name: "item", type: "object", fields: [{ name: "campo_1", type: "string" }] } })}
              >
                <Plus className="w-3 h-3 mr-2" /> Definir Estrutura do Item
              </Button>
            ) : (
              <SchemaFieldEditor
                field={field.items}
                level={level + 1}
                onUpdate={(updates) => onUpdate({ items: { ...field.items!, ...updates } })}
                onRemove={() => onUpdate({ items: undefined })}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function PromptsClient({ dynamicConfigs: initialConfigs }: PromptsClientProps) {
  const [configs, setConfigs] = useState<Record<string, DynamicAgentConfig>>(initialConfigs || {});
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [jsonImportText, setJsonImportText] = useState('');
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [importError, setImportError] = useState('');
  
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const handleSyncToFile = async () => {
    setShowSyncModal(false);
    setIsSaving(true);
    setStatus(null);
    try {
      const result = await syncDbToFileAction();
      if (result.ok) {
        setStatus({ 
          type: 'success', 
          message: `Sincronização concluída! ${result.count} agentes foram exportados para o arquivo JSON e um backup foi criado.` 
        });
      } else {
        setStatus({ type: 'error', message: `Erro na sincronização: ${result.error}` });
      }
    } catch (err) {
      setStatus({ type: 'error', message: `Erro fatal: ${String(err)}` });
    } finally {
      setIsSaving(false);
    }
  };

  const defaultAgentIds = (DEFAULT_PROMPTS && typeof DEFAULT_PROMPTS === 'object') ? Object.keys(DEFAULT_PROMPTS) : [];
  const dynamicAgentIds = (configs && typeof configs === 'object') ? Object.keys(configs) : [];
  const allAgents = Array.from(new Set([...defaultAgentIds, ...dynamicAgentIds])).sort();

  const currentConfig = selectedAgent ? configs[selectedAgent] : null;
  const isCustomized = !!currentConfig;

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgent(agentId);
    
    if (!configs[agentId] && DEFAULT_PROMPTS[agentId as AgentName]) {
      const draft: DynamicAgentConfig = {
        id: agentId,
        name: agentId.replace('-agent', '').toUpperCase(),
        prompt: DEFAULT_PROMPTS[agentId as AgentName],
        isActive: true,
        schema: DEFAULT_SCHEMAS[agentId as AgentName] || [
          { name: "exemplo_campo", type: "string", description: "Modifique este schema" }
        ],
        modelKey: "google_flash"
      };
      setConfigs({ ...configs, [agentId]: draft });
    }
  };

  const updateCurrentConfig = (updates: Partial<DynamicAgentConfig>) => {
    if (!selectedAgent || !configs[selectedAgent]) return;
    setConfigs({
      ...configs,
      [selectedAgent]: { ...configs[selectedAgent], ...updates }
    });
  };

  const handleSave = async () => {
    if (!selectedAgent || !currentConfig) return;
    setIsSaving(true);
    setStatus(null);
    try {
      const result = await saveAgentAction(currentConfig);
      if (result.ok) {
        setStatus({ type: 'success', message: `Agente "${currentConfig.name}" salvo com sucesso no banco de dados.` });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => setStatus(null), 5000);
      } else {
        setStatus({ type: 'error', message: `Erro ao salvar: ${result.error}` });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: `Erro fatal: ${String(err)}` });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedAgent) return;
    if (!confirm('Tem certeza que deseja deletar esta configuração dinâmica? Se for um agente padrão, ele voltará para o código fixo. Se for novo, será perdido.')) return;
    
    setIsSaving(true);
    setStatus(null);
    try {
      const result = await deleteAgentAction(selectedAgent);
      if (result.ok) {
        setStatus({ type: 'success', message: 'Configuração dinâmica removida com sucesso.' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const newConfigs = { ...configs };
        delete newConfigs[selectedAgent];
        setConfigs(newConfigs);
        if (!DEFAULT_PROMPTS[selectedAgent as AgentName]) {
          setSelectedAgent('');
        }
        setTimeout(() => setStatus(null), 5000);
      } else {
        setStatus({ type: 'error', message: `Erro ao deletar: ${result.error}` });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: `Erro fatal: ${String(err)}` });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  const addField = () => {
    if (!currentConfig) return;
    updateCurrentConfig({
      schema: [...currentConfig.schema, { name: "novo_campo", type: "string", description: "" }]
    });
  };

  const updateField = (index: number, updates: Partial<DynamicFieldDefinition>) => {
    if (!currentConfig) return;
    const newSchema = [...currentConfig.schema];
    newSchema[index] = { ...newSchema[index], ...updates };
    updateCurrentConfig({ schema: newSchema });
  };

  const removeField = (index: number) => {
    if (!currentConfig) return;
    const newSchema = currentConfig.schema.filter((_, i) => i !== index);
    updateCurrentConfig({ schema: newSchema });
  };

  const handleCreateNewAgent = () => {
    const id = prompt("Digite o ID do novo agente (ex: novo-documento-agent):");
    if (!id) return;
    
    const slug = id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    if (configs[slug] || DEFAULT_PROMPTS[slug as AgentName]) {
      alert("Já existe um agente com este ID.");
      return;
    }

    const newAgent: DynamicAgentConfig = {
      id: slug,
      name: slug.replace('-agent', '').toUpperCase(),
      prompt: "Você é um especialista em extração de dados.\n\nSPECIFIC RULES:\n- Extraia os dados solicitados no schema.",
      isActive: true,
      schema: [
        { name: "campo_exemplo", type: "string", description: "Descrição do campo" }
      ],
      modelKey: "google_flash"
    };

    setConfigs({ ...configs, [slug]: newAgent });
    setSelectedAgent(slug);
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonImportText);
      const newSchema = inferSchemaFromJson(parsed);
      
      if (newSchema.length === 0) {
        setImportError('O JSON deve ser um objeto com pelo menos uma chave.');
        return;
      }

      updateCurrentConfig({ schema: newSchema });
      setShowJsonImport(false);
      setJsonImportText('');
      setImportError('');
    } catch (e) {
      setImportError('JSON inválido. Verifique a sintaxe.');
    }
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Gerenciador de Agentes (Plataforma Dinâmica)</PageTitle>
            <SectionDescription className="mt-1">
              Crie novos agentes ou edite o prompt e schema de extração dos agentes existentes.
            </SectionDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSyncModal(true)} disabled={isSaving}>
              <DatabaseZap className="w-4 h-4 mr-2 text-amber-600" />
              Sincronizar Banco → JSON
            </Button>
            <Button onClick={handleCreateNewAgent}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Agente
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuração do Agente</CardTitle>
            <CardDescription> Selecione um agente existente para edição. </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {status && (
              <div className={cn(
                "flex items-start gap-3 p-4 rounded-lg border animate-in fade-in slide-in-from-top-2 duration-300",
                status.type === 'success' 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                  : "bg-red-50 border-red-200 text-red-800"
              )}>
                {status.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
                )}
                <div className="flex-1 text-sm font-medium">
                  {status.message}
                </div>
                <button 
                  onClick={() => setStatus(null)}
                  className={cn(
                    "p-1 rounded-md transition-colors",
                    status.type === 'success' ? "hover:bg-emerald-100" : "hover:bg-red-100"
                  )}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label>Agente</Label>
              <Select value={selectedAgent} onValueChange={handleSelectAgent}>
                <SelectTrigger className="w-full md:w-[400px]">
                  <SelectValue placeholder="Selecione um agente..." />
                </SelectTrigger>
                <SelectContent>
                  {allAgents.map((agent) => (
                    <SelectItem key={agent} value={agent}>
                      {agent} {configs[agent] ? " (Dinâmico)" : " (Fixo/Padrão)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentConfig && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome de Exibição</Label>
                    <Input 
                      value={currentConfig.name} 
                      onChange={(e) => updateCurrentConfig({ name: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo LLM Recomendado</Label>
                    <Select 
                      value={currentConfig.modelKey || "google_flash"} 
                      onValueChange={(val: any) => updateCurrentConfig({ modelKey: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google_flash">Gemini Flash (Rápido e Barato)</SelectItem>
                        <SelectItem value="google_pro">Gemini Pro (Complexo e Lento)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2 border rounded-md p-4">
                  <Switch 
                    id="agent-active" 
                    checked={currentConfig.isActive}
                    onCheckedChange={(checked) => updateCurrentConfig({ isActive: checked })}
                  />
                  <Label htmlFor="agent-active" className="flex-1 cursor-pointer">
                    <div className="font-semibold text-base">Agente Dinâmico Ativado</div>
                    <div className="text-sm font-normal text-muted-foreground">
                      Se desativado, o orquestrador ignorará esta configuração e fará o fallback para o código fixo (se existir).
                    </div>
                  </Label>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Prompt do Sistema (Instruções da IA)</Label>
                  </div>
                  <textarea
                    className="min-h-[250px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                    value={currentConfig.prompt}
                    onChange={(e) => updateCurrentConfig({ prompt: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div>
                      <h3 className="font-semibold text-lg">Schema de Extração (JSON)</h3>
                      <p className="text-sm text-muted-foreground">Defina os campos que a IA deve devolver.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowJsonImport(!showJsonImport)}
                        className={cn(showJsonImport && "bg-zinc-100")}
                      >
                        <FileJson className="w-4 h-4 mr-2" />
                        Importar de JSON
                      </Button>
                      <Button variant="outline" size="sm" onClick={addField}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Campo
                      </Button>
                    </div>
                  </div>

                  {showJsonImport && (
                    <div className="bg-zinc-900 p-4 rounded-lg space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex justify-between items-center">
                        <Label className="text-zinc-100 text-xs font-bold uppercase">Cole um exemplo de JSON de saída</Label>
                        <Button variant="ghost" size="icon" onClick={() => setShowJsonImport(false)} className="h-6 w-6 text-zinc-400 hover:text-white">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <textarea
                        className="w-full h-40 bg-zinc-800 border-zinc-700 text-zinc-100 text-xs font-mono p-3 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder='{ "nome": "João", "idade": 30, "tags": ["a", "b"] }'
                        value={jsonImportText}
                        onChange={(e) => setJsonImportText(e.target.value)}
                      />
                      {importError && <p className="text-red-400 text-[10px] font-medium">{importError}</p>}
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => setShowJsonImport(false)}>Cancelar</Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-none" onClick={handleImportJson}>
                          Gerar Schema
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {currentConfig.schema.map((field, idx) => (
                      <SchemaFieldEditor
                        key={idx}
                        field={field}
                        onUpdate={(updates) => updateField(idx, updates)}
                        onRemove={() => removeField(idx)}
                      />
                    ))}
                    
                    {currentConfig.schema.length === 0 && (
                      <div className="text-center p-8 border border-dashed rounded-md text-muted-foreground">
                        Nenhum campo definido. A IA não terá uma estrutura clara para extrair.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </CardContent>
          {currentConfig && (
            <CardFooter className="flex justify-between border-t p-6">
              <Button variant="outline" onClick={handleRestore} disabled={!isCustomized || isSaving} className="text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Deletar Configuração
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Agente
              </Button>
            </CardFooter>
          )}
        </Card>

        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md shadow-2xl border-amber-200 animate-in zoom-in-95 duration-200">
              <CardHeader className="bg-amber-50/50 border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-full">
                    <DatabaseZap className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-amber-900">Sincronização Crítica</CardTitle>
                    <CardDescription className="text-amber-700/80 font-medium">Exportar Banco de Dados para JSON</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Esta ação irá sobrescrever o arquivo <code className="bg-zinc-100 px-1 rounded text-zinc-900 font-bold">data/dynamic-agents.json</code> com as configurações que você editou aqui no front-end.
                </p>
                
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">O que acontecerá:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-zinc-600">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>Um <strong>backup</strong> do arquivo JSON atual será salvo na tabela <code className="text-xs">agent_backups</code>.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-zinc-600">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>O arquivo de código local será atualizado permanentemente.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-blue-50 rounded-md border border-blue-100 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-[11px] text-blue-700 leading-normal">
                    Use esta função apenas após testar os novos prompts e ter certeza de que eles não quebraram a lógica de comparação do sistema.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3 bg-zinc-50/50 border-t p-4">
                <Button variant="ghost" onClick={() => setShowSyncModal(false)} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button 
                  className="bg-amber-600 hover:bg-amber-700 text-white border-none shadow-md shadow-amber-200"
                  onClick={handleSyncToFile} 
                  disabled={isSaving}
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <DatabaseZap className="w-4 h-4 mr-2" />}
                  Confirmar Exportação
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
