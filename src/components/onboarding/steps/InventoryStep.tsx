import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ArrowLeft, ArrowRight, CheckCircle2, Plus } from 'lucide-react';

interface InventoryStepProps {
  onNext: () => void;
  onBack: () => void;
}

const inventoryCategories = [
  { name: 'Roupas de Cama', items: ['Lençol', 'Fronhas', 'Edredom', 'Protetor de Colchão'] },
  { name: 'Roupas de Banho', items: ['Toalhas de Banho', 'Toalhas de Rosto', 'Tapete de Banheiro'] },
  { name: 'Cozinha', items: ['Pratos', 'Copos', 'Talheres', 'Panelas'] },
  { name: 'Limpeza', items: ['Vassoura', 'Rodo', 'Pano de Chão', 'Produtos de Limpeza'] },
];

export function InventoryStep({ onNext, onBack }: InventoryStepProps) {
  return (
    <div className="max-w-2xl w-full">
      <div className="text-center mb-8">
        <div className="mb-6 flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Package className="h-7 w-7" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Controle de Inventário</h2>
        <p className="text-muted-foreground">
          Configure o inventário padrão para suas propriedades. Você poderá personalizar por propriedade depois.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {inventoryCategories.map((category) => (
          <Card key={category.name}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                {category.name}
                <span className="text-xs font-normal text-muted-foreground">
                  {category.items.length} itens
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {category.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="sm" className="mt-3 w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar item
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-8 bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            💡 <strong>Dica:</strong> Você pode personalizar o inventário de cada propriedade individualmente na página de configurações da propriedade.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={onNext}>
          Próximo
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
