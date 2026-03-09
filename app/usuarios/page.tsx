import { CrudModule } from "@/components/backoffice/crud-module";
import { PageHeaderCard } from "@/components/ui/page-header-card";

export default function UsuariosPage() {
  return (
    <div className="space-y-4">
      <PageHeaderCard
        title="Usuarios"
        description="Usuarios de la aplicación."
      />

      <CrudModule
        title="Usuarios"
        resource="usuarios"
        fields={[
          { key: "email", label: "Email" },
          { key: "nombre", label: "Nombre" },
          {
            key: "activo",
            label: "Activo",
            type: "select",
            options: [
              { value: "true", label: "Activo" },
              { value: "false", label: "Inactivo" },
            ],
          },
        ]}
        columns={[
          { key: "email", label: "Email" },
          { key: "nombre", label: "Nombre" },
          { key: "activo", label: "Estado", badge: true },
        ]}
        initial={{ email: "", nombre: "", activo: "true" }}
      />
    </div>
  );
}

