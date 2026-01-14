import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Loader2, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Property {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  details?: string;
  photo_url?: string;
  photo_taken_at?: string;
}

interface InventoryCategory {
  id: string;
  name: string;
  description?: string;
  property_id?: string;
  items: InventoryItem[];
}

interface InventoryPDFReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  categories: InventoryCategory[];
  selectedPropertyId: string;
}

export const InventoryPDFReport = ({
  open,
  onOpenChange,
  properties,
  categories,
  selectedPropertyId,
}: InventoryPDFReportProps) => {
  const [generating, setGenerating] = useState(false);
  const [propertyFilter, setPropertyFilter] = useState(selectedPropertyId);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);

  const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Filter categories by property
      const filteredCategories = propertyFilter === 'all' 
        ? categories 
        : categories.filter(c => c.property_id === propertyFilter);

      if (filteredCategories.length === 0) {
        toast.error('Nenhuma categoria encontrada para gerar o relatório');
        return;
      }

      // Get property name for title
      const propertyName = propertyFilter === 'all' 
        ? 'Todas as Propriedades' 
        : properties.find(p => p.id === propertyFilter)?.name || 'Propriedade';

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Relatório de Inventário', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Property name
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(propertyName, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      // Date
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
      pdf.setTextColor(0);
      yPosition += 15;

      // Count items with photos for progress
      let itemsWithPhotos = 0;
      let processedPhotos = 0;
      if (includePhotos) {
        filteredCategories.forEach(cat => {
          cat.items.forEach(item => {
            if (item.photo_url) itemsWithPhotos++;
          });
        });
      }

      // Process each category
      for (const category of filteredCategories) {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }

        // Category header
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, yPosition - 5, pageWidth - margin * 2, 10, 'F');
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(category.name, margin + 3, yPosition + 2);
        
        // Property name if showing all
        if (propertyFilter === 'all' && category.property_id) {
          const propName = properties.find(p => p.id === category.property_id)?.name;
          if (propName) {
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100);
            pdf.text(`(${propName})`, margin + pdf.getTextWidth(category.name) + 8, yPosition + 2);
            pdf.setTextColor(0);
          }
        }
        yPosition += 12;

        // Items
        for (const item of category.items) {
          // Check for page break
          const estimatedHeight = includePhotos && item.photo_url ? 45 : 15;
          if (yPosition + estimatedHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }

          // Item name and quantity
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`• ${item.name}`, margin + 5, yPosition);
          
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${item.quantity} ${item.unit || 'un'}`, pageWidth - margin - 30, yPosition);
          yPosition += 5;

          // Details
          if (includeDetails && item.details) {
            pdf.setFontSize(9);
            pdf.setTextColor(80);
            const detailLines = pdf.splitTextToSize(item.details, pageWidth - margin * 2 - 10);
            pdf.text(detailLines, margin + 8, yPosition);
            yPosition += detailLines.length * 4;
            pdf.setTextColor(0);
          }

          // Photo
          if (includePhotos && item.photo_url) {
            try {
              const imgData = await loadImageAsBase64(item.photo_url);
              if (imgData) {
                const imgWidth = 35;
                const imgHeight = 35;
                pdf.addImage(imgData, 'JPEG', margin + 8, yPosition, imgWidth, imgHeight);
                
                // Photo timestamp
                if (item.photo_taken_at) {
                  pdf.setFontSize(7);
                  pdf.setTextColor(100);
                  pdf.text(
                    format(new Date(item.photo_taken_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
                    margin + 8,
                    yPosition + imgHeight + 3
                  );
                  pdf.setTextColor(0);
                }
                yPosition += imgHeight + 8;
              }
              processedPhotos++;
            } catch (e) {
              console.error('Error loading image:', e);
            }
          }

          yPosition += 3;
        }

        yPosition += 8;
      }

      // Footer with page numbers
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      // Save
      const fileName = `inventario-${propertyName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
      toast.success('Relatório PDF gerado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGenerating(false);
    }
  };

  const totalItems = (propertyFilter === 'all' ? categories : categories.filter(c => c.property_id === propertyFilter))
    .reduce((acc, cat) => acc + cat.items.length, 0);

  const totalPhotos = (propertyFilter === 'all' ? categories : categories.filter(c => c.property_id === propertyFilter))
    .reduce((acc, cat) => acc + cat.items.filter(i => i.photo_url).length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Relatório PDF
          </DialogTitle>
          <DialogDescription>
            Exporte o inventário em formato PDF para impressão ou arquivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Propriedade</Label>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a propriedade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as propriedades</SelectItem>
                {properties.map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-photos" 
                checked={includePhotos} 
                onCheckedChange={(checked) => setIncludePhotos(!!checked)}
              />
              <label htmlFor="include-photos" className="text-sm cursor-pointer">
                Incluir fotos ({totalPhotos} fotos)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-details" 
                checked={includeDetails} 
                onCheckedChange={(checked) => setIncludeDetails(!!checked)}
              />
              <label htmlFor="include-details" className="text-sm cursor-pointer">
                Incluir detalhes/observações
              </label>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="text-muted-foreground">
              O relatório incluirá <span className="font-medium text-foreground">{totalItems} itens</span>
              {includePhotos && totalPhotos > 0 && (
                <> com <span className="font-medium text-foreground">{totalPhotos} fotos</span></>
              )}
            </p>
            {includePhotos && totalPhotos > 10 && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Muitas fotos podem demorar para processar
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancelar
          </Button>
          <Button onClick={generatePDF} disabled={generating || totalItems === 0}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
