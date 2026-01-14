import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Building2, 
  MapPin, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Property {
  id: string;
  name: string;
  address: string | null;
  airbnb_ical_url: string | null;
  created_at: string;
  schedulesCount?: number;
  checklistsCount?: number;
}

export function PropertiesSection() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('name');

      if (error) throw error;

      // Fetch additional counts for each property
      const propertiesWithCounts = await Promise.all(
        (data || []).map(async (property) => {
          const [schedulesRes, checklistsRes] = await Promise.all([
            supabase
              .from('schedules')
              .select('id', { count: 'exact', head: true })
              .eq('property_id', property.id),
            supabase
              .from('property_checklists')
              .select('id', { count: 'exact', head: true })
              .eq('property_id', property.id),
          ]);

          return {
            ...property,
            schedulesCount: schedulesRes.count || 0,
            checklistsCount: checklistsRes.count || 0,
          };
        })
      );

      setProperties(propertiesWithCounts);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Todas as Propriedades</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie todas as propriedades cadastradas na plataforma
          </p>
        </div>
        <Button onClick={fetchProperties} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar propriedade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">
              {filteredProperties.length} propriedades
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Propriedade</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="text-center">Limpezas</TableHead>
                <TableHead className="text-center">Checklists</TableHead>
                <TableHead className="text-center">iCal</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredProperties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma propriedade encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredProperties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-medium">{property.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm truncate max-w-[200px]">
                          {property.address || 'Não informado'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{property.schedulesCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={property.checklistsCount === 0 ? 'destructive' : 'outline'}>
                        {property.checklistsCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {property.airbnb_ical_url ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(property.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
