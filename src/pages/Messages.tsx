import { Construction, MessageSquare, Bell, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Messages() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-orange-50/30 to-amber-50/20 dark:from-[#1a1d21] dark:via-[#1a1d21] dark:to-[#1a1d21]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-stone-50/80 dark:bg-[#22252a]/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/')}
              className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mensagens</h1>
          </div>
          <button className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center mb-6">
            <Construction className="w-12 h-12 text-amber-600 dark:text-amber-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Em Desenvolvimento
          </h2>
          
          <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            Estamos trabalhando em um sistema de mensagens para facilitar a comunicação entre você e sua equipe.
          </p>
          
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Chat em Tempo Real</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Converse diretamente com sua equipe</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <Bell className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Notificações Push</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Receba alertas importantes</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-stone-50/80 dark:bg-[#22252a]/80 backdrop-blur-lg border-t border-slate-200/50 dark:border-slate-700/50" />
        <div className="relative flex h-20 items-center justify-around px-2 pb-2">
          <button 
            onClick={() => navigate('/')}
            className="group flex flex-col items-center justify-center gap-1 p-2 transition-colors text-[#8A8B88] hover:text-primary"
          >
            <span className="material-symbols-outlined text-[28px] transition-transform group-active:scale-90">dashboard</span>
            <span className="text-[10px] font-medium">Início</span>
          </button>
          <button 
            onClick={() => navigate('/?tab=agenda')}
            className="group flex flex-col items-center justify-center gap-1 p-2 transition-colors text-[#8A8B88] hover:text-primary"
          >
            <span className="material-symbols-outlined text-[28px] transition-transform group-active:scale-90">calendar_today</span>
            <span className="text-[10px] font-medium">Agenda</span>
          </button>
          <button 
            className="group flex flex-col items-center justify-center gap-1 p-2 transition-colors text-primary"
          >
            <div className="relative">
              <span className="material-symbols-outlined text-[28px] transition-transform group-active:scale-90">chat_bubble</span>
            </div>
            <span className="text-[10px] font-bold">Msgs</span>
          </button>
          <button 
            onClick={() => navigate('/minha-conta')}
            className="group flex flex-col items-center justify-center gap-1 p-2 transition-colors text-[#8A8B88] hover:text-primary"
          >
            <span className="material-symbols-outlined text-[28px] transition-transform group-active:scale-90">menu</span>
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
