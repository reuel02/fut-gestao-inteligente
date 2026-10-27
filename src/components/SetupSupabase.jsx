import { Database, Key, Server, CheckCircle } from 'lucide-react'

export default function SetupSupabase() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black p-4 text-zinc-100">
      <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl">
        <div className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-zinc-950 shadow-lg shadow-emerald-500/25">
            <Database className="size-7" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
            Configuração Inicial
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
            Conecte seu Supabase
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Os scripts do banco já foram gerados com o schema <strong className="text-white">fut</strong>,
            controle de acesso, admin e funções prontas.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Key className="size-4" /> 1. Crie o arquivo .env
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Crie o arquivo <code className="text-white">.env</code> na raiz do projeto com as chaves do seu projeto Supabase:
            </p>
            <pre className="mt-2.5 overflow-x-auto rounded-xl bg-black p-3 font-mono text-[11px] text-zinc-300">
{`VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica`}
            </pre>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Server className="size-4" /> 2. Execute os scripts SQL no Supabase
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              No painel do Supabase (<span className="text-zinc-200">SQL Editor</span>), execute os 5 arquivos criados na pasta <code className="text-white">supabase/migrations/</code> em ordem.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <CheckCircle className="size-4" /> 3. Exponha o schema "fut"
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Vá em <strong className="text-white">Project Settings → Data API → Exposed schemas</strong> e adicione o schema <strong className="text-emerald-400">fut</strong>.
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-900 pt-4 text-center">
          <p className="text-xs text-zinc-500">
            Assim que você salvar o arquivo <code className="text-zinc-300">.env</code>, o Vite atualizará a tela automaticamente para a tela de Login!
          </p>
        </div>
      </div>
    </div>
  )
}
