import type { supabase } from "@/integrations/supabase/client";
import type { ContractItem } from "@/types/contract";

/**
 * Substitui os itens de um contrato sem janela de perda: insere os novos
 * primeiro e só então apaga os antigos (os que não acabaram de ser gravados).
 * Se o insert falhar, os itens antigos continuam lá.
 */
export async function replaceContractItems(
  db: typeof supabase,
  contractId: string,
  items: ContractItem[],
): Promise<void> {
  let keepIds: string[] = [];

  if (items.length > 0) {
    const { data, error } = await db
      .from("contract_items")
      .insert(
        items.map((item) => ({
          contract_id: contractId,
          item_name: item.item_name,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
      )
      .select("id");

    if (error) throw error;
    keepIds = (data ?? []).map((row) => row.id);
  }

  let del = db.from("contract_items").delete().eq("contract_id", contractId);
  if (keepIds.length > 0) del = del.not("id", "in", `(${keepIds.join(",")})`);

  const { error: deleteError } = await del;
  if (deleteError) throw deleteError;
}
