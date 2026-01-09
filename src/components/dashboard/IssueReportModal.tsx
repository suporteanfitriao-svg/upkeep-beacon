import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface IssueReportModalProps {
  onClose: () => void;
  onSubmit: (issue: {
    section: string;
    item: string;
    description: string;
    photos: string[];
  }) => void;
}

const SECTIONS = [
  { id: 'kitchen', name: 'Cozinha', description: 'Geladeira, fogão, pia, armários', icon: 'kitchen' },
  { id: 'living', name: 'Sala de Estar', description: 'Sofá, TV, tapete, decoração', icon: 'chair' },
  { id: 'bedroom', name: 'Quarto', description: 'Cama, roupa de cama, armários', icon: 'bed' },
  { id: 'bathroom', name: 'Banheiro', description: 'Chuveiro, vaso, pia, toalhas', icon: 'bathtub' },
  { id: 'laundry', name: 'Área de Serviço', description: 'Máquina de lavar, produtos', icon: 'local_laundry_service' },
  { id: 'outdoor', name: 'Área Externa', description: 'Varanda, piscina, jardim', icon: 'deck' },
  { id: 'other', name: 'Outro / Geral', description: 'Hall, corredor, porta de entrada', icon: 'category' },
];

const ITEMS_BY_SECTION: Record<string, { value: string; label: string }[]> = {
  kitchen: [
    { value: 'sink', label: 'Pia / Torneira' },
    { value: 'fridge', label: 'Geladeira' },
    { value: 'stove', label: 'Fogão' },
    { value: 'microwave', label: 'Microondas' },
    { value: 'cabinet', label: 'Armários' },
    { value: 'floor', label: 'Piso / Azulejo' },
    { value: 'other', label: 'Outros' },
  ],
  living: [
    { value: 'sofa', label: 'Sofá' },
    { value: 'tv', label: 'TV' },
    { value: 'carpet', label: 'Tapete' },
    { value: 'decoration', label: 'Decoração' },
    { value: 'other', label: 'Outros' },
  ],
  bedroom: [
    { value: 'bed', label: 'Cama' },
    { value: 'bedding', label: 'Roupa de Cama' },
    { value: 'wardrobe', label: 'Armários' },
    { value: 'lamp', label: 'Luminária' },
    { value: 'other', label: 'Outros' },
  ],
  bathroom: [
    { value: 'shower', label: 'Chuveiro' },
    { value: 'toilet', label: 'Vaso Sanitário' },
    { value: 'sink', label: 'Pia' },
    { value: 'towels', label: 'Toalhas' },
    { value: 'other', label: 'Outros' },
  ],
  laundry: [
    { value: 'washer', label: 'Máquina de Lavar' },
    { value: 'dryer', label: 'Secadora' },
    { value: 'products', label: 'Produtos' },
    { value: 'other', label: 'Outros' },
  ],
  outdoor: [
    { value: 'balcony', label: 'Varanda' },
    { value: 'pool', label: 'Piscina' },
    { value: 'garden', label: 'Jardim' },
    { value: 'other', label: 'Outros' },
  ],
  other: [
    { value: 'hall', label: 'Hall' },
    { value: 'corridor', label: 'Corredor' },
    { value: 'door', label: 'Porta de Entrada' },
    { value: 'other', label: 'Outros' },
  ],
};

export function IssueReportModal({ onClose, onSubmit }: IssueReportModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedSectionData = SECTIONS.find(s => s.id === selectedSection);
  const itemOptions = selectedSection ? ITEMS_BY_SECTION[selectedSection] || [] : [];

  const handleNextStep = () => {
    if (!selectedSection) {
      toast.error('Selecione uma seção');
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      onClose();
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (photos.length >= 3) {
        toast.error('Máximo de 3 fotos');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!description.trim()) {
      toast.error('Preencha a descrição do problema');
      return;
    }

    onSubmit({
      section: selectedSectionData?.name || '',
      item: itemOptions.find(i => i.value === selectedItem)?.label || selectedItem,
      description,
      photos,
    });
    
    toast.success('Avaria reportada com sucesso!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-stone-50 dark:bg-[#22252a] font-display text-slate-800 dark:text-slate-100 antialiased">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-24">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center bg-stone-50/90 dark:bg-[#22252a]/90 px-4 py-4 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
          <button 
            onClick={handleBack}
            className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 mr-2"
          >
            <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold leading-none tracking-tight text-slate-900 dark:text-white">
              {step === 1 ? 'Reportar Avaria' : 'Detalhes da Avaria'}
            </h2>
            <span className="text-xs font-medium text-[#8A8B88] dark:text-slate-400">
              Etapa {step} de 2
            </span>
          </div>
          <div className="ml-auto">
            <button 
              onClick={onClose}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </header>

        {/* Step 1: Select Section */}
        {step === 1 && (
          <main className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Onde é o problema?</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Selecione a seção da propriedade onde você identificou a avaria ou item danificado.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              {SECTIONS.map((section) => (
                <label key={section.id} className="relative cursor-pointer group">
                  <input 
                    type="radio" 
                    name="section" 
                    value={section.id}
                    checked={selectedSection === section.id}
                    onChange={() => setSelectedSection(section.id)}
                    className="peer sr-only" 
                  />
                  <div className={cn(
                    "flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#2d3138] border shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition-all",
                    selectedSection === section.id 
                      ? "border-primary ring-1 ring-primary" 
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}>
                    <div className={cn(
                      "h-12 w-12 shrink-0 rounded-full flex items-center justify-center transition-colors",
                      selectedSection === section.id 
                        ? "bg-primary text-white" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-primary"
                    )}>
                      <span className="material-symbols-outlined">{section.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className={cn(
                        "font-bold transition-colors",
                        selectedSection === section.id 
                          ? "text-primary" 
                          : "text-slate-900 dark:text-white group-hover:text-primary"
                      )}>{section.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{section.description}</p>
                    </div>
                    <div className={cn(
                      "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                      selectedSection === section.id 
                        ? "border-primary bg-primary" 
                        : "border-slate-300 dark:border-slate-600"
                    )}>
                      {selectedSection === section.id && (
                        <div className="h-2.5 w-2.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </main>
        )}

        {/* Step 2: Details */}
        {step === 2 && selectedSectionData && (
          <main className="flex flex-col gap-6 p-6">
            {/* Section Header */}
            <div className="flex items-center gap-4 px-1">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-white shadow-[0_4px_20px_-2px_rgba(51,153,153,0.3)]">
                <span className="material-symbols-outlined text-[24px]">{selectedSectionData.icon}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">Seção</p>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">{selectedSectionData.name}</h1>
              </div>
            </div>

            {/* Item Select */}
            <section className="bg-white dark:bg-[#2d3138] rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-5 border border-slate-100 dark:border-slate-700">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                <span className="material-symbols-outlined text-primary text-[18px]">check_box_outline_blank</span>
                Item Avariado
              </label>
              <div className="relative group">
                <select 
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full appearance-none rounded-xl bg-stone-50 dark:bg-[#22252a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white py-4 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-medium cursor-pointer hover:border-primary/50"
                >
                  <option value="">Selecione uma opção...</option>
                  {itemOptions.map(item => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">expand_more</span>
                </div>
              </div>
            </section>

            {/* Description */}
            <section className="bg-white dark:bg-[#2d3138] rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-5 border border-slate-100 dark:border-slate-700">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                <span className="material-symbols-outlined text-primary text-[18px]">edit_note</span>
                Descrição do Problema
              </label>
              <div className="relative">
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[160px] rounded-xl bg-stone-50 dark:bg-[#22252a] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none placeholder-slate-400 dark:placeholder-slate-500 text-base leading-relaxed"
                  placeholder="Descreva os detalhes aqui. Ex: A torneira está vazando água mesmo fechada..."
                />
                <div className="absolute bottom-3 right-3">
                  <span className="text-[10px] font-semibold text-slate-400 bg-white dark:bg-[#22252a] px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700">Obrigatório</span>
                </div>
              </div>
            </section>

            {/* Photo Upload */}
            <section className="bg-white dark:bg-[#2d3138] rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-5 border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-end mb-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                  <span className="material-symbols-outlined text-primary text-[18px]">photo_camera</span>
                  Evidência
                </label>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">Recomendado</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {/* Add Photo Button */}
                {photos.length < 3 && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 hover:bg-primary/10 active:scale-95 transition-all group cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 text-primary flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform z-10">
                      <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
                    </div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wide z-10">FOTO</span>
                  </button>
                )}
                
                {/* Uploaded Photos */}
                {photos.map((photo, index) => (
                  <div key={index} className="aspect-square rounded-xl overflow-hidden relative group">
                    <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}
                
                {/* Empty Slots */}
                {Array.from({ length: Math.max(0, 2 - photos.length) }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-700/50 opacity-60">
                    <div className="h-1 w-8 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">Toque para abrir a câmera ou galeria</p>
              
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </section>
          </main>
        )}

        {/* Footer Button */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-50/95 dark:bg-[#22252a]/95 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-700/50 p-4">
          {step === 1 ? (
            <button 
              onClick={handleNextStep}
              disabled={!selectedSection}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white shadow-[0_4px_20px_-2px_rgba(51,153,153,0.3)] transition-all hover:bg-[#267373] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Avançar</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              className="w-full bg-primary hover:bg-[#267373] text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined">save</span>
              Salvar Relatório
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
