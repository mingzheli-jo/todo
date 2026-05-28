import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProvider,
  deleteProvider,
  fetchProviders,
  setDefaultProvider,
  updateProvider,
} from "../api/aiProviders";
import Dialog from "../components/ui/Dialog";
import type { AIProvider, AIProviderCreate } from "../types";

interface ProviderFormData {
  name: string;
  base_url: string;
  api_key: string;
  model_name: string;
}

const EMPTY_FORM: ProviderFormData = { name: "", base_url: "", api_key: "", model_name: "" };

export default function AISettingsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<AIProvider | null>(null);
  const [form, setForm] = useState<ProviderFormData>(EMPTY_FORM);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["ai-providers"],
    queryFn: fetchProviders,
  });

  const createMutation = useMutation({
    mutationFn: (data: AIProviderCreate) => createProvider(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-providers"] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AIProviderCreate> }) => updateProvider(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-providers"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProvider(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-providers"] }),
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => setDefaultProvider(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-providers"] }),
  });

  const openNew = () => {
    setEditProvider(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (p: AIProvider) => {
    setEditProvider(p);
    setForm({ name: p.name, base_url: p.base_url, api_key: "", model_name: p.model_name });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditProvider(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editProvider) {
      const payload: Partial<AIProviderCreate> = {
        name: form.name,
        base_url: form.base_url,
        model_name: form.model_name,
      };
      if (form.api_key) payload.api_key = form.api_key;
      updateMutation.mutate({ id: editProvider.id, data: payload });
    } else {
      createMutation.mutate({
        name: form.name,
        base_url: form.base_url,
        api_key: form.api_key || undefined,
        model_name: form.model_name,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <h1 className="text-xl font-bold">🤖 AI 配置</h1>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-xs font-semibold shadow-lg shadow-brand/30"
        >
          ✚ 添加 Provider
        </button>
      </header>

      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="text-center text-white/30 py-20">加载中...</div>
        ) : providers.length === 0 ? (
          <div className="text-center text-white/30 py-20">
            <div className="text-4xl mb-3">🤖</div>
            <div>暂无 AI Provider，点击右上角添加</div>
          </div>
        ) : (
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">默认</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">名称</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">模型</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">API 地址</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => !p.is_default && defaultMutation.mutate(p.id)}
                        disabled={p.is_default || defaultMutation.isPending}
                        title={p.is_default ? "当前默认" : "设为默认"}
                        className={`w-4 h-4 rounded-full border-2 transition ${
                          p.is_default
                            ? "border-brand bg-brand"
                            : "border-white/20 hover:border-brand"
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3 text-white/80 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-white/50 font-mono text-xs">{p.model_name}</td>
                    <td className="px-4 py-3 text-white/40 text-xs truncate max-w-[200px]">{p.base_url}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-xs text-white/40 hover:text-white/80 transition px-2 py-1 rounded hover:bg-white/[0.06]"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(p.id)}
                          disabled={deleteMutation.isPending}
                          className="text-xs text-red-400/60 hover:text-red-400 transition px-2 py-1 rounded hover:bg-red-400/[0.06]"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editProvider ? "编辑 Provider" : "添加 Provider"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="名称"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="例如：DeepSeek"
            required
          />
          <FormField
            label="API 地址"
            value={form.base_url}
            onChange={(v) => setForm((f) => ({ ...f, base_url: v }))}
            placeholder="https://api.deepseek.com/v1"
            required
          />
          <FormField
            label={editProvider ? "API Key（留空则不修改）" : "API Key"}
            value={form.api_key}
            onChange={(v) => setForm((f) => ({ ...f, api_key: v }))}
            placeholder="sk-..."
            type="password"
          />
          <FormField
            label="模型名称"
            value={form.model_name}
            onChange={(v) => setForm((f) => ({ ...f, model_name: v }))}
            placeholder="deepseek-chat"
            required
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeDialog}
              className="flex-1 py-2 rounded-lg bg-white/[0.06] text-white/60 text-sm hover:bg-white/[0.10] transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-sm font-semibold shadow-lg shadow-brand/30 disabled:opacity-50 transition"
            >
              {isPending ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-white/40 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand/50 transition"
      />
    </div>
  );
}
