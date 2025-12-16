import { FileText, Construction } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MainLayout } from "@/components/compras/MainLayout";

const Pedidos = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Ordens de compra geradas</p>
        </div>

        <Card className="p-12 text-center">
          <Construction className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Em Construção</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Esta tela está sendo desenvolvida. Aqui você poderá visualizar e gerenciar todas as ordens de compra geradas.
          </p>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Pedidos;
