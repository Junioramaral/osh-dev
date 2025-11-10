import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Package, AlertCircle } from "lucide-react";

export default function Applications() {
  const { profile } = useAuth();

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["application-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_products")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ["application-instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_instances")
        .select(`
          *,
          clients(name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const getCriticalityColor = (criticality: string) => {
    const colors = {
      baixa: "bg-success text-success-foreground",
      media: "bg-warning text-warning-foreground",
      alta: "bg-destructive text-destructive-foreground",
    };
    return colors[criticality as keyof typeof colors] || "bg-muted";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Aplicativos</h1>
            <p className="text-muted-foreground">Catálogo de produtos e implantações</p>
          </div>
          {(profile?.role === "admin" || profile?.role === "analista-app") && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Implantação
            </Button>
          )}
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="instances">Implantações</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {productsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-[200px]" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        {product.name}
                      </CardTitle>
                      {product.description && (
                        <CardDescription>{product.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {product.modules && Array.isArray(product.modules) && product.modules.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Módulos:</p>
                          <div className="flex flex-wrap gap-1">
                            {product.modules.map((module: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {typeof module === 'string' ? module : module.name || 'Módulo'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum produto cadastrado</h3>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="instances" className="space-y-4">
            {instancesLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-[200px]" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : instances && instances.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {instances.map((instance) => (
                  <Card key={instance.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {instance.clients?.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{instance.version}</Badge>
                        <Badge variant="secondary">{instance.environment}</Badge>
                      </div>
                      {instance.criticality && (
                        <Badge className={getCriticalityColor(instance.criticality)}>
                          Criticidade: {instance.criticality}
                        </Badge>
                      )}
                      {instance.active_modules && Array.isArray(instance.active_modules) && instance.active_modules.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Módulos ativos:</p>
                          <div className="flex flex-wrap gap-1">
                            {instance.active_modules.slice(0, 3).map((module: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {typeof module === 'string' ? module : module.name || 'Módulo'}
                              </Badge>
                            ))}
                            {instance.active_modules.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{instance.active_modules.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma implantação encontrada</h3>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
