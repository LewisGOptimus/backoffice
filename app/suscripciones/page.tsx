"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJson, isSuccess } from "@/lib/client/api";
import { formatDateOnly } from "@/lib/client/date-format";
import { formatMoney } from "@/lib/client/currency-format";
import { toHumanConsumableError, toHumanError } from "@/lib/client/error-mapping";
import toast from "react-hot-toast";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeaderCard } from "@/components/ui/page-header-card";
import { AppModal } from "@/components/ui/modal";

type Row = Record<string, unknown> & { id?: string };

type Lookup = {
  empresas: Array<{ value: string; label: string }>;
  planes: Array<{ value: string; label: string }>;
  productos: Array<{ value: string; label: string }>;
  suscripciones: Array<{ value: string; label: string }>;
  usuarios: Array<{ value: string; label: string }>;
  precios_planes: Array<{ id: string; plan_id: string; periodo: string; valor: string }>;
};

type SubscriptionEntitlementRow = {
  entitlement_id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  valor_entero: number | null;
  valor_booleano: boolean | null;
  origen: string;
  efectivo_desde: string;
  efectivo_hasta: string | null;
};

type ProductCatalogRow = {
  id: string;
  nombre: string;
  codigo: string;
  tipo: string;
  es_consumible: boolean;
};

type ProductPriceRow = {
  id: string;
  producto_id: string;
  periodo: string;
  moneda_id: string;
  valor: string;
  activo: boolean;
  valido_desde: string | null;
  valido_hasta: string | null;
};

type DraftItem = {
  origen: string;
  producto_id: string;
  precio_id: string;
  cantidad: string;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_efectiva_inicio: string;
  fecha_efectiva_fin: string;
};

type DiscountDraft = {
  tipo: "" | "PERCENT" | "FIXED";
  valor: string;
  motivo: string;
};

const EMPTY_DRAFT: DraftItem = {
  origen: "ADDON",
  producto_id: "",
  precio_id: "",
  cantidad: "1",
  fecha_inicio: "",
  fecha_fin: "",
  fecha_efectiva_inicio: "",
  fecha_efectiva_fin: "",
};

const EMPTY_DISCOUNT: DiscountDraft = {
  tipo: "",
  valor: "",
  motivo: "",
};

function computeDiscountPreview(subtotal: number, discount: DiscountDraft) {
  if (!Number.isFinite(subtotal) || subtotal <= 0 || !discount.tipo || discount.valor.trim() === "") {
    return { subtotal: Number.isFinite(subtotal) ? subtotal : 0, discount: 0, total: Math.max(0, subtotal || 0) };
  }
  const value = Number(discount.valor);
  if (!Number.isFinite(value) || value < 0) {
    return { subtotal, discount: 0, total: subtotal };
  }
  const raw = discount.tipo === "PERCENT" ? subtotal * (value / 100) : value;
  const amount = Number(Math.min(subtotal, Math.max(0, raw)).toFixed(2));
  return { subtotal: Number(subtotal.toFixed(2)), discount: amount, total: Number((subtotal - amount).toFixed(2)) };
}

function badge(value: string) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-semibold">{value}</span>;
}

function isPriceValidForDate(price: ProductPriceRow, date: string): boolean {
  if (!price.activo) return false;
  if (!date) return true;
  if (price.valido_desde && price.valido_desde > date) return false;
  if (price.valido_hasta && price.valido_hasta < date) return false;
  return true;
}

export default function SuscripcionesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [lookups, setLookups] = useState<Lookup>({ empresas: [], planes: [], productos: [], suscripciones: [], usuarios: [], precios_planes: [] });
  const [catalog, setCatalog] = useState<ProductCatalogRow[]>([]);
  const [prices, setPrices] = useState<ProductPriceRow[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("Listo");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    empresa_id: "",
    plan_id: "",
    billing_cycle: "MENSUAL",
    modo_renovacion: "MANUAL",
    fecha_inicio: "",
    estado: "ACTIVA",
    generar_factura: "false",
    operational_status: "EN_SERVICIO",
    grace_days_granted: "0",
    grace_until: "",
  });
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [draft, setDraft] = useState<DraftItem>(EMPTY_DRAFT);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<DraftItem>(EMPTY_DRAFT);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [autoInvoiceOnAddItem, setAutoInvoiceOnAddItem] = useState(true);
  const [createDiscount, setCreateDiscount] = useState<DiscountDraft>(EMPTY_DISCOUNT);
  const [addItemDiscount, setAddItemDiscount] = useState<DiscountDraft>(EMPTY_DISCOUNT);
  const [selectedEntitlements, setSelectedEntitlements] = useState<SubscriptionEntitlementRow[]>([]);

  const showApiError = (res: { error: { code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "BUSINESS_RULE_VIOLATION" | "INTERNAL_ERROR" | "UNAUTHORIZED"; message: string } }) => {
    const msg = toHumanConsumableError(res.error.message) ?? toHumanError(res.error.code, res.error.message);
    setMessage(msg);
    toast.error(msg);
  };

  const refresh = async () => {
    try {
      const [s, i, l, p, pr] = await Promise.all([
        fetchJson<Row[]>("/api/v1/suscripciones"),
        fetchJson<Row[]>("/api/v1/items-suscripcion"),
        fetchJson<Lookup>("/api/backoffice/lookups"),
        fetchJson<ProductCatalogRow[]>("/api/v1/productos"),
        fetchJson<ProductPriceRow[]>("/api/v1/precios"),
      ]);
      if (isSuccess(s)) setRows(s.data);
      if (isSuccess(i)) setItems(i.data);
      if (isSuccess(l)) setLookups(l.data);
      if (isSuccess(p)) setCatalog(p.data);
      if (isSuccess(pr)) setPrices(pr.data);
    } catch {
      toast.error("Error de red al cargar suscripciones.");
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const selectedItems = useMemo(() => items.filter((x) => String(x.suscripcion_id) === selected), [items, selected]);
  const draftProduct = useMemo(() => catalog.find((p) => p.id === draft.producto_id) ?? null, [catalog, draft.producto_id]);
  const editingItemProduct = useMemo(() => catalog.find((p) => p.id === itemForm.producto_id) ?? null, [catalog, itemForm.producto_id]);
  const selectedDraftPrice = useMemo(() => prices.find((p) => p.id === draft.precio_id) ?? null, [prices, draft.precio_id]);
  const selectedPlanPrice = useMemo(() => {
    if (!form.plan_id || !form.billing_cycle) return null;
    return lookups.precios_planes.find((p) => p.plan_id === form.plan_id && p.periodo === form.billing_cycle) ?? null;
  }, [lookups.precios_planes, form.plan_id, form.billing_cycle]);
  const createInvoicePreview = useMemo(
    () => computeDiscountPreview(Number(selectedPlanPrice?.valor ?? 0), createDiscount),
    [selectedPlanPrice, createDiscount],
  );
  const addItemInvoicePreview = useMemo(
    () => computeDiscountPreview(Number((Number(selectedDraftPrice?.valor ?? 0) * Number(draft.cantidad || 0)).toFixed(2)), addItemDiscount),
    [selectedDraftPrice, draft.cantidad, addItemDiscount],
  );

  const availableDraftPrices = useMemo(() => {
    if (!draft.producto_id) return [];
    return prices
      .filter((p) => p.producto_id === draft.producto_id)
      .filter((p) => isPriceValidForDate(p, draft.fecha_inicio || new Date().toISOString().slice(0, 10)))
      .sort((a, b) => `${b.valido_desde ?? ""}${b.id}`.localeCompare(`${a.valido_desde ?? ""}${a.id}`));
  }, [prices, draft.producto_id, draft.fecha_inicio]);

  const availableEditPrices = useMemo(() => {
    if (!itemForm.producto_id) return [];
    return prices
      .filter((p) => p.producto_id === itemForm.producto_id)
      .filter((p) => isPriceValidForDate(p, itemForm.fecha_inicio || new Date().toISOString().slice(0, 10)))
      .sort((a, b) => `${b.valido_desde ?? ""}${b.id}`.localeCompare(`${a.valido_desde ?? ""}${a.id}`));
  }, [prices, itemForm.producto_id, itemForm.fecha_inicio]);

  const resetDraft = (startDate = "") => setDraft({ ...EMPTY_DRAFT, fecha_inicio: startDate });
  const openCreate = () => {
    const today = new Date().toISOString().slice(0, 10);
    setEditing(null);
    setForm({
      empresa_id: "",
      plan_id: "",
      billing_cycle: "MENSUAL",
      modo_renovacion: "MANUAL",
      fecha_inicio: today,
      estado: "ACTIVA",
      generar_factura: "false",
      operational_status: "EN_SERVICIO",
      grace_days_granted: "0",
      grace_until: "",
    });
    setDraftItems([]);
    resetDraft(today);
    setCreateDiscount(EMPTY_DISCOUNT);
    setModal(true);
  };

  const openEdit = (row: Row) => {
    setEditing(String(row.id));
    setForm({
      empresa_id: String(row.empresa_id ?? ""),
      plan_id: String(row.plan_id ?? ""),
      billing_cycle: String(row.billing_cycle ?? row.periodo ?? "MENSUAL"),
      modo_renovacion: String(row.modo_renovacion ?? "MANUAL"),
      fecha_inicio: String(row.fecha_inicio ?? ""),
      estado: String(row.estado ?? "ACTIVA"),
      generar_factura: "false",
      operational_status: String(row.operational_status ?? "EN_SERVICIO"),
      grace_days_granted: String(row.grace_days_granted ?? 0),
      grace_until: String(row.grace_until ?? ""),
    });
    setDraftItems([]);
    resetDraft(String(row.fecha_inicio ?? ""));
    setCreateDiscount(EMPTY_DISCOUNT);
    setModal(true);
  };

  const validateItem = (value: DraftItem): string | null => {
    if (!value.producto_id) return "Selecciona un producto.";
    if (!value.fecha_inicio) return "Define la fecha de inicio del item.";
    const qty = Number(value.cantidad);
    if (!Number.isFinite(qty) || qty <= 0) return "La cantidad debe ser mayor a 0.";
    if (value.fecha_fin && value.fecha_fin < value.fecha_inicio) return "La fecha fin no puede ser menor que fecha inicio.";
    if (value.fecha_efectiva_inicio && value.fecha_efectiva_fin && value.fecha_efectiva_fin < value.fecha_efectiva_inicio) {
      return "La vigencia efectiva final no puede ser menor a la inicial.";
    }

    const product = catalog.find((p) => p.id === value.producto_id);
    if (!product) return "El producto no existe.";

    const validPrices = prices
      .filter((p) => p.producto_id === value.producto_id)
      .filter((p) => isPriceValidForDate(p, value.fecha_inicio));

    if (product.es_consumible && !value.precio_id) return "Para consumibles debes seleccionar un precio vigente.";
    if (value.precio_id && !validPrices.find((p) => p.id === value.precio_id)) {
      return "El precio seleccionado no pertenece al producto o no esta vigente para la fecha indicada.";
    }

    return null;
  };

  const save = async () => {
    try {
      if (editing) {
        const payload = {
          ...form,
          generar_factura: undefined,
          grace_days_granted: Number(form.grace_days_granted || 0),
        };
        const res = await fetchJson<Row>(`/api/v1/suscripciones/${editing}`, { method: "PATCH", body: payload });
        if (isSuccess(res)) {
          setMessage("Suscripcion actualizada.");
          toast.success("Suscripcion actualizada.");
          setModal(false);
          await refresh();
          return;
        }
        showApiError(res);
        return;
      }

      const payload: Record<string, unknown> = {
        empresa_id: form.empresa_id,
        plan_id: form.plan_id,
        billing_cycle: form.billing_cycle,
        modo_renovacion: form.modo_renovacion,
        fecha_inicio: form.fecha_inicio,
        generar_factura: form.generar_factura === "true",
        items_suscripcion: draftItems,
      };
      if (form.generar_factura === "true" && createDiscount.tipo) {
        payload.descuento_tipo = createDiscount.tipo;
        payload.descuento_valor = createDiscount.valor;
        payload.descuento_motivo = createDiscount.motivo.trim() || null;
      }

      const res = await fetchJson<{ suscripcion_id: string; factura_id: string | null }>("/api/backoffice/suscripciones/create-with-options", { method: "POST", body: payload });
      if (isSuccess(res)) {
        const msg = res.data.factura_id ? "Suscripcion creada con factura." : "Suscripcion creada sin factura.";
        setMessage(msg);
        toast.success(msg);
        setModal(false);
        await refresh();
        return;
      }
      showApiError(res);
    } catch {
      toast.error("Error de red al guardar suscripcion.");
    }
  };

  const addDraftItem = () => {
    const error = validateItem(draft);
    if (error) {
      toast.error(error);
      return;
    }
    setDraftItems((prev) => [...prev, { ...draft }]);
    resetDraft(form.fecha_inicio);
  };

  const addItemExisting = async () => {
    if (!selected) return;
    const error = validateItem(draft);
    if (error) {
      toast.error(error);
      return;
    }

    try {
      const hasPrice = Boolean(selectedDraftPrice);
      const unitPrice = selectedDraftPrice ? Number(selectedDraftPrice.valor) : 0;
      const itemTotal = Number((unitPrice * Number(draft.cantidad)).toFixed(2));
      const payload: Record<string, unknown> = {
        suscripcion_id: selected,
        producto_id: draft.producto_id,
        precio_id: draft.precio_id || null,
        cantidad: Number(draft.cantidad),
        fecha_inicio: draft.fecha_inicio,
        fecha_fin: draft.fecha_fin || null,
        fecha_efectiva_inicio: draft.fecha_efectiva_inicio || null,
        fecha_efectiva_fin: draft.fecha_efectiva_fin || null,
        generar_factura: autoInvoiceOnAddItem,
      };
      if (autoInvoiceOnAddItem && addItemDiscount.tipo) {
        payload.descuento_tipo = addItemDiscount.tipo;
        payload.descuento_valor = addItemDiscount.valor;
        payload.descuento_motivo = addItemDiscount.motivo.trim() || null;
      }
      const res = await fetchJson<{ item_suscripcion_id: string; factura_id: string | null }>("/api/backoffice/suscripciones/add-item-with-options", { method: "POST", body: payload });
      if (isSuccess(res)) {
        const msg = res.data.factura_id
          ? `Item agregado y facturado por ${formatMoney(itemTotal)}.`
          : hasPrice
            ? `Item agregado por ${formatMoney(itemTotal)} (sin factura).`
            : "Item agregado sin factura.";
        setMessage(msg);
        toast.success(msg);
        resetDraft(new Date().toISOString().slice(0, 10));
        setAutoInvoiceOnAddItem(true);
        setAddItemDiscount(EMPTY_DISCOUNT);
        setAddItemModalOpen(false);
        await refresh();
        return;
      }
      showApiError(res);
    } catch {
      toast.error("Error de red al agregar item.");
    }
  };

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!selected) {
        setSelectedEntitlements([]);
        return;
      }
      try {
        const res = await fetchJson<SubscriptionEntitlementRow[]>(`/api/backoffice/suscripciones/${selected}/entitlements`);
        if (isSuccess(res)) setSelectedEntitlements(res.data);
      } catch {
        toast.error("Error de red al cargar entitlements de la suscripcion.");
      }
    }, 0);
    return () => clearTimeout(t);
  }, [selected]);

  const remove = async (id: string) => {
    try {
      const res = await fetchJson<Row>(`/api/v1/suscripciones/${id}`, { method: "DELETE" });
      if (isSuccess(res)) {
        setMessage("Suscripcion eliminada.");
        toast.success("Suscripcion eliminada.");
        await refresh();
        return;
      }
      showApiError(res);
    } catch {
      toast.error("Error de red al eliminar suscripcion.");
    }
  };

  const removeItem = async (id: string) => {
    try {
      const res = await fetchJson<Row>(`/api/v1/items-suscripcion/${id}`, { method: "DELETE" });
      if (isSuccess(res)) {
        setMessage("Item eliminado.");
        toast.success("Item eliminado.");
        await refresh();
        return;
      }
      showApiError(res);
    } catch {
      toast.error("Error de red al eliminar item.");
    }
  };

  const openEditItem = (item: Row) => {
    setEditingItemId(String(item.id));
    setItemForm({
      origen: String(item.origen ?? "ADDON"),
      producto_id: String(item.producto_id ?? ""),
      precio_id: String(item.precio_id ?? ""),
      cantidad: String(item.cantidad ?? "1"),
      fecha_inicio: String(item.fecha_inicio ?? ""),
      fecha_fin: String(item.fecha_fin ?? ""),
      fecha_efectiva_inicio: String(item.fecha_efectiva_inicio ?? ""),
      fecha_efectiva_fin: String(item.fecha_efectiva_fin ?? ""),
    });
    setItemModalOpen(true);
  };

  const saveItemEdit = async () => {
    if (!editingItemId) return;
    const error = validateItem(itemForm);
    if (error) {
      toast.error(error);
      return;
    }

    try {
      const payload = {
        producto_id: itemForm.producto_id,
        precio_id: itemForm.precio_id || null,
        cantidad: Number(itemForm.cantidad),
        fecha_inicio: itemForm.fecha_inicio,
        fecha_fin: itemForm.fecha_fin || null,
        fecha_efectiva_inicio: itemForm.fecha_efectiva_inicio || null,
        fecha_efectiva_fin: itemForm.fecha_efectiva_fin || null,
        origen: itemForm.origen,
        estado: "ACTIVO",
      };
      const res = await fetchJson<Row>(`/api/v1/items-suscripcion/${editingItemId}`, { method: "PATCH", body: payload });
      if (isSuccess(res)) {
        toast.success("Item actualizado.");
        setMessage("Item actualizado.");
        setItemModalOpen(false);
        setEditingItemId(null);
        await refresh();
        return;
      }
      showApiError(res);
    } catch {
      toast.error("Error de red al actualizar item.");
    }
  };

  const finalizeItem = async (itemId: string) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetchJson<Row>(`/api/v1/items-suscripcion/${itemId}`, {
        method: "PATCH",
        body: { estado: "EXPIRADO", fecha_fin: today, fecha_efectiva_fin: today },
      });
      if (isSuccess(res)) {
        toast.success("Item finalizado.");
        setMessage("Item finalizado.");
        await refresh();
        return;
      }
      showApiError(res);
    } catch {
      toast.error("Error de red al finalizar item.");
    }
  };

  const companyLabel = (id: string) => lookups.empresas.find((x) => x.value === id)?.label ?? id;
  const planLabel = (id: string) => lookups.planes.find((x) => x.value === id)?.label ?? id;
  const productLabel = (id: string) => lookups.productos.find((x) => x.value === id)?.label ?? id;
  const priceLabel = (id: string) => {
    const p = prices.find((x) => x.id === id);
    if (!p) return "-";
    return `${p.periodo} | ${formatMoney(p.valor)}`;
  };

  const renderGuidedItemBuilder = (mode: "existing" | "draft") => (
    <div className="mt-2 rounded border border-slate-200 p-3">
      <p className="text-xs font-semibold">Flujo guiado item: Producto - Precio - Cantidad - Vigencia</p>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <label className="text-xs">1. Producto<select value={draft.producto_id} onChange={(e) => setDraft((p) => ({ ...p, producto_id: e.target.value, precio_id: "" }))} className="mt-1 ui-input"><option value="">Producto...</option>{lookups.productos.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
        <label className="text-xs">2. Precio ({draftProduct?.es_consumible ? "obligatorio" : "opcional"})<select value={draft.precio_id} onChange={(e) => setDraft((p) => ({ ...p, precio_id: e.target.value }))} className="mt-1 ui-input" disabled={!draft.producto_id}><option value="">Seleccionar precio...</option>{availableDraftPrices.map((pr) => <option key={pr.id} value={pr.id}>{`${pr.periodo} | ${formatMoney(pr.valor)} | ${formatDateOnly(pr.valido_desde)} - ${formatDateOnly(pr.valido_hasta)}`}</option>)}</select></label>
        <label className="text-xs">3. Cantidad<input type="number" value={draft.cantidad} onChange={(e) => setDraft((p) => ({ ...p, cantidad: e.target.value }))} className="mt-1 ui-input" /></label>
        <div className="md:col-span-2 border-t border-slate-200 pt-2">
          <p className="text-[11px] text-slate-600">Fechas (guia rapida)</p>
          <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-600">
            <li>Cuando compras un paquete que se activa de inmediato, usa las mismas fechas para pago y vigencia efectiva. Ejemplo: compra de 100 documentos para usar hoy.</li>
            <li>Cuando haces un upgrade a mitad del ciclo, la vigencia efectiva inicia el dia del cambio y termina con el ciclo actual. Ejemplo: subir limite de empleados desde el 15 hasta fin de mes.</li>
            <li>Cuando vendes un servicio con validez fija independiente del cobro, separa pago y vigencia efectiva. Ejemplo: certificado pagado hoy que entra en vigencia la proxima semana.</li>
          </ul>
        </div>
        <label className="text-xs">4. Fecha inicio (pago)<input type="date" value={draft.fecha_inicio} onChange={(e) => setDraft((p) => ({ ...p, fecha_inicio: e.target.value, precio_id: "" }))} className="mt-1 ui-input" /></label>
        <label className="text-xs">Vigencia fin (pago)<input type="date" value={draft.fecha_fin} onChange={(e) => setDraft((p) => ({ ...p, fecha_fin: e.target.value }))} className="mt-1 ui-input" /></label>
        <label className="text-xs">Vigencia efectiva inicio<input type="date" value={draft.fecha_efectiva_inicio} onChange={(e) => setDraft((p) => ({ ...p, fecha_efectiva_inicio: e.target.value }))} className="mt-1 ui-input" /></label>
        <label className="text-xs">Vigencia efectiva fin<input type="date" value={draft.fecha_efectiva_fin} onChange={(e) => setDraft((p) => ({ ...p, fecha_efectiva_fin: e.target.value }))} className="mt-1 ui-input" /></label>
      </div>
      {draft.producto_id && availableDraftPrices.length === 0 && <p className="mt-2 text-xs text-amber-700">No hay precios vigentes para este producto en la fecha seleccionada.</p>}
      {draftProduct?.es_consumible && <p className="mt-1 text-xs text-slate-600">Para consumibles, `precio_id` es obligatorio y se valida por vigencia.</p>}
      {mode === "existing" && (
        <div className="mt-3 space-y-2 rounded border border-slate-200 bg-slate-50 p-2 text-xs">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoInvoiceOnAddItem}
              onChange={(e) => setAutoInvoiceOnAddItem(e.target.checked)}
            />
            Facturar automaticamente al agregar este item
          </label>
          <p>
            Valor unitario: {selectedDraftPrice ? formatMoney(selectedDraftPrice.valor) : "-"} | Cantidad: {draft.cantidad || "0"} | Total factura:{" "}
            {selectedDraftPrice ? formatMoney(Number(selectedDraftPrice.valor) * Number(draft.cantidad || 0)) : "-"}
          </p>
          {autoInvoiceOnAddItem && (
            <div className="grid gap-2 md:grid-cols-3">
              <label className="text-xs">Tipo descuento
                <select value={addItemDiscount.tipo} onChange={(e) => setAddItemDiscount((p) => ({ ...p, tipo: e.target.value as DiscountDraft["tipo"] }))} className="mt-1 ui-input">
                  <option value="">Sin descuento</option>
                  <option value="PERCENT">Porcentaje</option>
                  <option value="FIXED">Monto fijo</option>
                </select>
              </label>
              <label className="text-xs">Valor descuento
                <input type="number" value={addItemDiscount.valor} onChange={(e) => setAddItemDiscount((p) => ({ ...p, valor: e.target.value }))} className="mt-1 ui-input" />
              </label>
              <label className="text-xs">Motivo
                <input type="text" value={addItemDiscount.motivo} onChange={(e) => setAddItemDiscount((p) => ({ ...p, motivo: e.target.value }))} className="mt-1 ui-input" />
              </label>
            </div>
          )}
          {autoInvoiceOnAddItem && (
            <p>
              Subtotal: {formatMoney(addItemInvoicePreview.subtotal)} | Descuento: {formatMoney(addItemInvoicePreview.discount)} | Neto: {formatMoney(addItemInvoicePreview.total)}
            </p>
          )}
          {autoInvoiceOnAddItem && !selectedDraftPrice && <p className="text-amber-700">Para facturar automaticamente debes seleccionar un precio.</p>}
        </div>
      )}
      <button
        onClick={mode === "existing" ? addItemExisting : addDraftItem}
        disabled={mode === "existing" && autoInvoiceOnAddItem && !selectedDraftPrice}
        className="mt-3 ui-btn ui-btn-primary ui-btn-sm disabled:opacity-50"
      >
        {mode === "existing" ? "Agregar item a suscripcion" : "Agregar item manual"}
      </button>
    </div>
  );

  return (
    <main className="space-y-4">
      <PageHeaderCard title="Suscripciones" description="Aquí se gestionan las suscripciones">
        <button
          onClick={openCreate}
          className="ui-btn ui-btn-primary ui-btn-sm"
        >
          Nueva suscripcion
        </button>
      </PageHeaderCard>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <DataTable<Row>
          className="max-h-[350px] overflow-auto rounded border border-slate-200"
          rows={rows}
          getRowKey={(r, idx) => `${String(r.id ?? "")}-${idx}`}
          columns={[
            {
              key: "__index",
              header: "#",
              cellClassName: "w-[40px]",
              render: (_r, idx) => idx + 1,
            },
            {
              key: "empresa",
              header: "Empresa",
              render: (r) => companyLabel(String((r as any).empresa_id)),
            },
            {
              key: "plan",
              header: "Plan",
              render: (r) => planLabel(String((r as any).plan_id)),
            },
            {
              key: "estado",
              header: "Estado",
              render: (r) => badge(String((r as any).estado)),
            },
            {
              key: "operativo",
              header: "Operativo",
              render: (r) =>
                badge(String((r as any).operational_status ?? "EN_SERVICIO")),
            },
            {
              key: "prorroga",
              header: "Prorroga",
              render: (r) =>
                `${String((r as any).grace_days_granted ?? 0)} dias`,
            },
            {
              key: "periodo",
              header: "Periodo",
              render: (r) =>
                badge(String((r as any).billing_cycle ?? (r as any).periodo)),
            },
            {
              key: "fin_ciclo",
              header: "Fin ciclo",
              render: (r) => formatDateOnly((r as any).periodo_actual_fin),
            },
            {
              key: "acciones",
              header: "Acciones",
              render: (r) => (
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelected(String((r as any).id))}
                    className="ui-btn ui-btn-outline ui-btn-sm"
                  >
                    Items
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="ui-btn ui-btn-secondary ui-btn-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => remove(String((r as any).id))}
                    className="ui-btn ui-btn-danger ui-btn-sm"
                  >
                    Eliminar
                  </button>
                </div>
              ),
            },
          ] as DataTableColumn<Row>[]}
        />
      </section>

      {selected && <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-semibold">Items de suscripcion</h3><button onClick={() => { setAutoInvoiceOnAddItem(true); setAddItemDiscount(EMPTY_DISCOUNT); setAddItemModalOpen(true); }} className="ui-btn ui-btn-primary ui-btn-sm">Agregar item</button></div><div className="max-h-64 overflow-auto rounded border border-slate-200"><table className="min-w-full text-xs"><thead className="bg-slate-50"><tr><th className="px-2 py-2 text-left">Producto</th><th className="px-2 py-2 text-left">Precio</th><th className="px-2 py-2 text-left">Cantidad</th><th className="px-2 py-2 text-left">Pago</th><th className="px-2 py-2 text-left">Efectivo</th><th className="px-2 py-2 text-left">Estado</th><th className="px-2 py-2 text-left">Acciones</th></tr></thead><tbody>{selectedItems.map((it) => <tr key={String(it.id)} className="border-t border-slate-100"><td className="px-2 py-2">{productLabel(String(it.producto_id))}</td><td className="px-2 py-2">{it.precio_id ? priceLabel(String(it.precio_id)) : "-"}</td><td className="px-2 py-2">{String(it.cantidad)}</td><td className="px-2 py-2">{formatDateOnly(it.fecha_inicio)} - {formatDateOnly(it.fecha_fin)}</td><td className="px-2 py-2">{formatDateOnly(it.fecha_efectiva_inicio)} - {formatDateOnly(it.fecha_efectiva_fin)}</td><td className="px-2 py-2">{badge(String(it.estado))}</td><td className="px-2 py-2"><div className="flex gap-1"><button onClick={() => openEditItem(it)} className="ui-btn ui-btn-secondary ui-btn-sm">Editar</button><button onClick={() => finalizeItem(String(it.id))} className="ui-btn ui-btn-secondary ui-btn-sm">Finalizar</button><button onClick={() => removeItem(String(it.id))} className="ui-btn ui-btn-danger ui-btn-sm">Eliminar</button></div></td></tr>)}</tbody></table></div>

      <div className="rounded border border-slate-200 p-3">
        <h4 className="font-semibold text-slate-900">Entitlements vigentes</h4>
        <DataTable<SubscriptionEntitlementRow>
          className="mt-2 max-h-56 overflow-auto rounded border border-slate-200"
          rows={selectedEntitlements}
          getRowKey={(ent) =>
            `${ent.entitlement_id}-${ent.origen}-${ent.efectivo_desde}`
          }
          emptyMessage="Sin entitlements vigentes."
          columns={[
            {
              key: "entitlement",
              header: "Entitlement",
              render: (ent) => `${ent.nombre} (${ent.codigo})`,
            },
            {
              key: "valor",
              header: "Valor",
              render: (ent) =>
                ent.valor_entero ?? String(ent.valor_booleano ?? "-"),
            },
            {
              key: "origen",
              header: "Origen",
              render: (ent) => badge(ent.origen),
            },
            {
              key: "vigencia",
              header: "Vigencia",
              render: (ent) =>
                `${formatDateOnly(ent.efectivo_desde)} - ${formatDateOnly(
                  ent.efectivo_hasta,
                )}`,
            },
          ] as DataTableColumn<SubscriptionEntitlementRow>[]}
        />
      </div>

      </section>}
      <p className="text-xs text-slate-600">{message}</p>

      <AppModal
        open={modal}
        onClose={() => setModal(false)}
        maxWidthClassName="max-w-3xl"
        title={editing ? "Editar suscripcion" : "Nueva suscripcion"}
      >
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <label className="text-xs">Empresa<select value={form.empresa_id} onChange={(e) => setForm((p) => ({ ...p, empresa_id: e.target.value }))} className="mt-1 ui-input"><option value="">Empresa...</option>{lookups.empresas.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
              <label className="text-xs">Plan<select value={form.plan_id} onChange={(e) => setForm((p) => ({ ...p, plan_id: e.target.value }))} className="mt-1 ui-input"><option value="">Plan...</option>{lookups.planes.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
              <label className="text-xs">Ciclo de cobro<select value={form.billing_cycle} onChange={(e) => setForm((p) => ({ ...p, billing_cycle: e.target.value }))} className="mt-1 ui-input"><option value="MENSUAL">MENSUAL</option><option value="TRIMESTRAL">TRIMESTRAL</option><option value="ANUAL">ANUAL</option></select></label>
              <label className="text-xs">Modo renovacion<select value={form.modo_renovacion} onChange={(e) => setForm((p) => ({ ...p, modo_renovacion: e.target.value }))} className="mt-1 ui-input"><option value="MANUAL">MANUAL</option><option value="AUTOMATICA">AUTOMATICA</option></select></label>
              <label className="text-xs">Fecha inicio<input type="date" value={form.fecha_inicio} onChange={(e) => { const v = e.target.value; setForm((p) => ({ ...p, fecha_inicio: v })); setDraft((p) => ({ ...p, fecha_inicio: v })); }} className="mt-1 ui-input" /></label>
              {editing ? (
                <label className="text-xs">Estado<select value={form.estado} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))} className="mt-1 ui-input"><option value="ACTIVA">ACTIVA</option><option value="PAUSADA">PAUSADA</option><option value="CANCELADA">CANCELADA</option><option value="EXPIRADA">EXPIRADA</option></select></label>
              ) : (
                <label className="text-xs">Generar factura<select value={form.generar_factura} onChange={(e) => setForm((p) => ({ ...p, generar_factura: e.target.value }))} className="mt-1 ui-input"><option value="false">No</option><option value="true">Si (EMITIDA)</option></select></label>
              )}
            </div>
            {editing && <div className="mt-3 rounded border border-slate-200 p-3"><p className="text-xs font-semibold">Prorroga de servicio</p><div className="mt-2 grid gap-2 md:grid-cols-2"><label className="text-xs">Estado operativo<select value={form.operational_status} onChange={(e) => setForm((p) => ({ ...p, operational_status: e.target.value }))} className="mt-1 ui-input"><option value="EN_SERVICIO">EN_SERVICIO</option><option value="EN_PRORROGA">EN_PRORROGA</option></select></label><label className="text-xs">Dias de prorroga<input type="number" min="0" value={form.grace_days_granted} onChange={(e) => setForm((p) => ({ ...p, grace_days_granted: e.target.value }))} className="mt-1 ui-input" /></label></div><p className="mt-2 text-[11px] text-slate-600">Se cuentan desde el fin del ciclo actual antes del bloqueo total.</p></div>}
            {!editing && form.generar_factura === "true" && (
              <div className="mt-3 rounded border border-slate-200 p-3">
                <p className="text-xs font-semibold">Descuento de factura (suscripcion base)</p>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <label className="text-xs">Tipo descuento
                    <select value={createDiscount.tipo} onChange={(e) => setCreateDiscount((p) => ({ ...p, tipo: e.target.value as DiscountDraft["tipo"] }))} className="mt-1 ui-input">
                      <option value="">Sin descuento</option>
                      <option value="PERCENT">Porcentaje</option>
                      <option value="FIXED">Monto fijo</option>
                    </select>
                  </label>
                  <label className="text-xs">Valor descuento<input type="number" value={createDiscount.valor} onChange={(e) => setCreateDiscount((p) => ({ ...p, valor: e.target.value }))} className="mt-1 ui-input" /></label>
                  <label className="text-xs">Motivo<input type="text" value={createDiscount.motivo} onChange={(e) => setCreateDiscount((p) => ({ ...p, motivo: e.target.value }))} className="mt-1 ui-input" /></label>
                </div>
                <p className="mt-2 text-xs text-slate-600">Subtotal: {formatMoney(createInvoicePreview.subtotal)} | Descuento: {formatMoney(createInvoicePreview.discount)} | Neto: {formatMoney(createInvoicePreview.total)}</p>
              </div>
            )}
            {!editing && (
              <div className="mt-3 rounded border border-slate-200 p-3">
                <p className="text-xs font-semibold">Items manuales opcionales</p>
                {renderGuidedItemBuilder("draft")}
                <ul className="mt-2 space-y-1 text-xs">
                  {draftItems.map((d, idx) => <li key={`${d.producto_id}-${idx}`} className="flex items-center justify-between rounded border border-slate-200 px-2 py-1"><span>{productLabel(d.producto_id)} | precio {d.precio_id ? priceLabel(d.precio_id) : "-"} | cant {d.cantidad} | pago {d.fecha_inicio || form.fecha_inicio}</span><button onClick={() => setDraftItems((prev) => prev.filter((_, i) => i !== idx))} className="ui-btn ui-btn-danger ui-btn-sm">Quitar</button></li>)}
                </ul>
              </div>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setModal(false)} className="ui-btn ui-btn-outline">Cancelar</button>
              <button onClick={save} className="ui-btn ui-btn-primary">Guardar</button>
            </div>
      </AppModal>

      <AppModal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        maxWidthClassName="max-w-2xl"
        title="Editar item de suscripcion"
      >
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="text-xs">Producto<select value={itemForm.producto_id} onChange={(e) => setItemForm((p) => ({ ...p, producto_id: e.target.value, precio_id: "" }))} className="mt-1 ui-input"><option value="">Producto...</option>{lookups.productos.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
          <label className="text-xs">Precio ({editingItemProduct?.es_consumible ? "obligatorio" : "opcional"})<select value={itemForm.precio_id} onChange={(e) => setItemForm((p) => ({ ...p, precio_id: e.target.value }))} className="mt-1 ui-input"><option value="">Precio...</option>{availableEditPrices.map((pr) => <option key={pr.id} value={pr.id}>{`${pr.periodo} | ${formatMoney(pr.valor)} | ${formatDateOnly(pr.valido_desde)} - ${formatDateOnly(pr.valido_hasta)}`}</option>)}</select></label>
          <label className="text-xs">Cantidad<input type="number" value={itemForm.cantidad} onChange={(e) => setItemForm((p) => ({ ...p, cantidad: e.target.value }))} className="mt-1 ui-input" /></label>
          <label className="text-xs">Fecha inicio<input type="date" value={itemForm.fecha_inicio} onChange={(e) => setItemForm((p) => ({ ...p, fecha_inicio: e.target.value, precio_id: "" }))} className="mt-1 ui-input" /></label>
          <label className="text-xs">Fecha fin<input type="date" value={itemForm.fecha_fin} onChange={(e) => setItemForm((p) => ({ ...p, fecha_fin: e.target.value }))} className="mt-1 ui-input" /></label>
          <label className="text-xs">Efectiva inicio<input type="date" value={itemForm.fecha_efectiva_inicio} onChange={(e) => setItemForm((p) => ({ ...p, fecha_efectiva_inicio: e.target.value }))} className="mt-1 ui-input" /></label>
          <label className="text-xs">Efectiva fin<input type="date" value={itemForm.fecha_efectiva_fin} onChange={(e) => setItemForm((p) => ({ ...p, fecha_efectiva_fin: e.target.value }))} className="mt-1 ui-input" /></label>
        </div>
        <p className="mt-2 text-xs text-slate-600">Para consumibles, el precio es obligatorio y debe estar vigente para la fecha de inicio.</p>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={() => setItemModalOpen(false)} className="ui-btn ui-btn-outline">Cancelar</button>
          <button onClick={saveItemEdit} className="ui-btn ui-btn-primary">Guardar cambios</button>
        </div>
      </AppModal>

      <AppModal
        open={addItemModalOpen}
        onClose={() => setAddItemModalOpen(false)}
        maxWidthClassName="max-w-3xl"
        title="Agregar item de suscripcion"
      >
        {renderGuidedItemBuilder("existing")}
        <div className="mt-3 flex justify-end">
          <button onClick={() => setAddItemModalOpen(false)} className="ui-btn ui-btn-outline">Cerrar</button>
        </div>
      </AppModal>
    </main>
  );
}




