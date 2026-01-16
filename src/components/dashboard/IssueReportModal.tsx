import { useState, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ChecklistItem } from '@/types/scheduling';
import { Loader2 } from 'lucide-react';

interface IssueReportModalProps {
  onClose: () => void;
  onSubmit: (issue: {
    category: string;
    itemLabel: string;
    description: string;
    photoFile?: File;
    severity: 'low' | 'medium' | 'high';
  }) => Promise<void>;
  checklist: ChecklistItem[];
  isSubmitting?: boolean;
  requirePhoto?: boolean;
}

// Fallback sections if no checklist is provided
const FALLBACK_SECTIONS = [
  { id: 'kitchen', name: 'Cozinha', icon: 'kitchen' },
  { id: 'living', name: 'Sala de Estar', icon: 'chair' },
  { id: 'bedroom', name: 'Quarto', icon: 'bed' },
  { id: 'bathroom', name: 'Banheiro', icon: 'bathtub' },
  { id: 'laundry', name: 'Área de Serviço', icon: 'local_laundry_service' },
  { id: 'outdoor', name: 'Área Externa', icon: 'deck' },
  { id: 'other', name: 'Outro / Geral', icon: 'category' },
];

const SECTION_ICONS: Record<string, string> = {
  'Cozinha': 'kitchen',
  'Kitchen': 'kitchen',
  'Sala': 'chair',
  'Sala de Estar': 'chair',
  'Living': 'chair',
  'Quarto': 'bed',
  'Bedroom': 'bed',
  'Banheiro': 'bathtub',
  'Bathroom': 'bathtub',
  'Lavanderia': 'local_laundry_service',
  'Área de Serviço': 'local_laundry_service',
  'Laundry': 'local_laundry_service',
  'Varanda': 'deck',
  'Área Externa': 'deck',
  'Outdoor': 'deck',
  'Geral': 'category',
  'General': 'category',
};

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Baixa', description: 'Não urgente, pode aguardar', color: 'bg-green-500' },
  { value: 'medium', label: 'Média', description: 'Precisa de atenção em breve', color: 'bg-yellow-500' },
  { value: 'high', label: 'Alta', description: 'Urgente, requer ação imediata', color: 'bg-red-500' },
] as const;

export function IssueReportModal({ onClose, onSubmit, checklist, isSubmitting = false, requirePhoto = false }: IssueReportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group checklist items by category
  const categories = useMemo(() => {
    if (!checklist || checklist.length === 0) {
      return FALLBACK_SECTIONS.map(s => ({
        name: s.name,
        icon: s.icon,
        items: [],
      }));
    }

    const grouped = checklist.reduce((acc, item) => {
      const category = item.category || 'Geral';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, ChecklistItem[]>);

    return Object.entries(grouped).map(([name, items]) => ({
      name,
      icon: SECTION_ICONS[name] || 'category',
      items,
    }));
  }, [checklist]);

  const selectedCategoryData = categories.find(c => c.name === selectedCategory);

  const handleNextStep = () => {
    if (step === 1 && !selectedCategory) {
      toast.error('Selecione um cômodo');
      return;
    }
    if (step === 2 && !selectedItem) {
      toast.error('Selecione um item');
      return;
    }
    setStep(prev => Math.min(prev + 1, 3) as 1 | 2 | 3);
  };

  const handleBack = () => {
    if (step === 1) {
      onClose();
    } else {
      setStep(prev => Math.max(prev - 1, 1) as 1 | 2 | 3);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG ou WebP.');
      return;
    }

    // Check file size (max 8MB before compression)
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo de 8MB.');
      return;
    }

    setPhotoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Preencha a descrição do problema');
      return;
    }

    if (!selectedCategory || !selectedItem) {
      toast.error('Selecione o cômodo e item');
      return;
    }

    // Validate photo requirement
    if (requirePhoto && !photoFile) {
      toast.error('Foto obrigatória para registrar a avaria');
      return;
    }

    try {
      await onSubmit({
        category: selectedCategory,
        itemLabel: selectedItem,
        description: description.trim(),
        photoFile: photoFile || undefined,
        severity,
      });
      onClose();
    } catch (error) {
      // Error already handled in onSubmit
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-stone-50 dark:bg-[#22252a] font-display text-slate-800 dark:text-slate-100 antialiased flex flex-col">
      <div className="relative flex-1 w-full flex flex-col overflow-x-hidden overflow-y-auto pb-24">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center bg-stone-50/90 dark:bg-[#22252a]/90 px-4 py-4 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
          <button 
            onClick={handleBack}
            disabled={isSubmitting}
            className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 mr-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold leading-none tracking-tight text-slate-900 dark:text-white">
              Registrar Avaria
            </h2>
            <span className="text-xs font-medium text-[#8A8B88] dark:text-slate-400">
              Etapa {step} de 3
            </span>
          </div>
          <div className="ml-auto">
            <button 
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div 
              className="h-full rounded-full bg-primary transition-all duration-300" 
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Select Category (Room) */}
        {step === 1 && (
          <main className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Onde está o problema?</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Selecione o cômodo onde você identificou a avaria.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              {categories.map((category) => (
                <label key={category.name} className="relative cursor-pointer group">
                  <input 
                    type="radio" 
                    name="category" 
                    value={category.name}
                    checked={selectedCategory === category.name}
                    onChange={() => {
                      setSelectedCategory(category.name);
                      setSelectedItem('');
                    }}
                    className="peer sr-only" 
                  />
                  <div className={cn(
                    "flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#2d3138] border shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition-all",
                    selectedCategory === category.name 
                      ? "border-primary ring-1 ring-primary" 
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}>
                    <div className={cn(
                      "h-12 w-12 shrink-0 rounded-full flex items-center justify-center transition-colors",
                      selectedCategory === category.name 
                        ? "bg-primary text-white" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-primary"
                    )}>
                      <span className="material-symbols-outlined">{category.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className={cn(
                        "font-bold transition-colors",
                        selectedCategory === category.name 
                          ? "text-primary" 
                          : "text-slate-900 dark:text-white group-hover:text-primary"
                      )}>{category.name}</h3>
                      {category.items.length > 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {category.items.length} itens
                        </p>
                      )}
                    </div>
                    <div className={cn(
                      "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                      selectedCategory === category.name 
                        ? "border-primary bg-primary" 
                        : "border-slate-300 dark:border-slate-600"
                    )}>
                      {selectedCategory === category.name && (
                        <div className="h-2.5 w-2.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </main>
        )}

        {/* Step 2: Select Item */}
        {step === 2 && selectedCategoryData && (
          <main className="flex flex-col gap-6 p-6">
            <div className="flex items-center gap-4 px-1">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-white shadow-[0_4px_20px_-2px_rgba(51,153,153,0.3)]">
                <span className="material-symbols-outlined text-[24px]">{selectedCategoryData.icon}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">Cômodo</p>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">{selectedCategoryData.name}</h1>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Qual item está avariado?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Selecione o item específico do checklist.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {selectedCategoryData.items.length > 0 ? (
                selectedCategoryData.items.map((item) => (
                  <label key={item.id} className="relative cursor-pointer group">
                    <input 
                      type="radio" 
                      name="item" 
                      value={item.title}
                      checked={selectedItem === item.title}
                      onChange={() => setSelectedItem(item.title)}
                      className="peer sr-only" 
                    />
                    <div className={cn(
                      "flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-[#2d3138] border transition-all",
                      selectedItem === item.title 
                        ? "border-primary ring-1 ring-primary" 
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}>
                      <div className={cn(
                        "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                        selectedItem === item.title 
                          ? "border-primary bg-primary" 
                          : "border-slate-300 dark:border-slate-600"
                      )}>
                        {selectedItem === item.title && (
                          <div className="h-2.5 w-2.5 rounded-full bg-white" />
                        )}
                      </div>
                      <span className={cn(
                        "font-medium transition-colors",
                        selectedItem === item.title 
                          ? "text-primary" 
                          : "text-slate-700 dark:text-slate-300"
                      )}>{item.title}</span>
                    </div>
                  </label>
                ))
              ) : (
                // Fallback: text input for item
                <div className="bg-white dark:bg-[#2d3138] rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <input
                    type="text"
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    placeholder="Digite o nome do item..."
                    className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>
              )}

              {/* Option to add custom item */}
              {selectedCategoryData.items.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setSelectedItem('outro')}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-xl border transition-all",
                      selectedItem === 'outro'
                        ? "border-primary ring-1 ring-primary bg-primary/5"
                        : "border-dashed border-slate-300 dark:border-slate-600 hover:border-primary"
                    )}
                  >
                    <span className="material-symbols-outlined text-slate-400">add</span>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Outro item não listado</span>
                  </button>
                  {selectedItem === 'outro' && (
                    <input
                      type="text"
                      placeholder="Descreva o item..."
                      onChange={(e) => setSelectedItem(e.target.value || 'outro')}
                      className="mt-2 w-full bg-white dark:bg-[#2d3138] rounded-xl p-4 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  )}
                </div>
              )}
            </div>
          </main>
        )}

        {/* Step 3: Description, Photo & Severity */}
        {step === 3 && (
          <main className="flex flex-col gap-5 p-5 pb-32">
            {/* Summary */}
            <div className="flex items-center gap-3 px-1">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">{selectedCategoryData?.icon || 'category'}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{selectedCategory}</p>
                <p className="font-bold text-slate-900 dark:text-white">{selectedItem}</p>
              </div>
            </div>

            {/* Severity */}
            <section className="bg-white dark:bg-[#2d3138] rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-5 border border-slate-100 dark:border-slate-700">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                <span className="material-symbols-outlined text-primary text-[18px]">priority_high</span>
                Gravidade
              </label>
              <div className="flex gap-2">
                {SEVERITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSeverity(option.value)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                      severity === option.value
                        ? "border-primary ring-1 ring-primary bg-primary/5"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <div className={cn("h-3 w-3 rounded-full", option.color)} />
                    <span className={cn(
                      "text-sm font-bold",
                      severity === option.value ? "text-primary" : "text-slate-700 dark:text-slate-300"
                    )}>{option.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Description */}
            <section className="bg-white dark:bg-[#2d3138] rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-5 border border-slate-100 dark:border-slate-700">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                <span className="material-symbols-outlined text-primary text-[18px]">edit_note</span>
                Descrição do Problema
                <span className="ml-auto text-[10px] font-semibold text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">Obrigatório</span>
              </label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[120px] rounded-xl bg-stone-50 dark:bg-[#22252a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none placeholder-slate-400 dark:placeholder-slate-500 text-base leading-relaxed"
                placeholder="Descreva o problema encontrado..."
              />
            </section>

            {/* Photo Upload */}
            <section className="bg-white dark:bg-[#2d3138] rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-5 border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                  <span className="material-symbols-outlined text-primary text-[18px]">photo_camera</span>
                  Foto da Avaria
                  {requirePhoto && (
                    <span className="text-[10px] font-semibold text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">Obrigatório</span>
                  )}
                </label>
                {!requirePhoto && <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">Recomendado</span>}
              </div>

              {!photoPreview ? (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 hover:bg-primary/10 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="h-14 w-14 rounded-full bg-white dark:bg-slate-800 text-primary flex items-center justify-center mb-3 shadow-sm">
                    <span className="material-symbols-outlined text-[28px]">add_a_photo</span>
                  </div>
                  <span className="text-sm font-bold text-primary">Tirar foto ou selecionar</span>
                  <span className="text-xs text-slate-500 mt-1">JPG, PNG ou WebP (máx. 8MB)</span>
                </button>
              ) : (
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-full aspect-video object-cover rounded-xl"
                  />
                  <button 
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    A imagem será comprimida automaticamente
                  </p>
                </div>
              )}
              
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </section>
          </main>
        )}

      </div>
      
      {/* Footer Button - Fixed at bottom, always visible */}
      <div className="sticky bottom-0 left-0 right-0 z-50 bg-stone-50 dark:bg-[#22252a] border-t border-slate-200 dark:border-slate-700 p-4 safe-area-inset-bottom">
          {step < 3 ? (
            <button 
              onClick={handleNextStep}
              disabled={(step === 1 && !selectedCategory) || (step === 2 && !selectedItem)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white shadow-[0_4px_20px_-2px_rgba(51,153,153,0.3)] transition-all hover:bg-[#267373] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Avançar</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || !description.trim() || (requirePhoto && !photoFile)}
              className="w-full bg-primary hover:bg-[#267373] text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  <span>Registrar Avaria</span>
                </>
              )}
            </button>
          )}
        </div>
    </div>
  );
}
