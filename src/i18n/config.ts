import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  pt: {
    translation: {
      "common": {
        "loading": "Carregando...",
        "save": "Salvar",
        "cancel": "Cancelar",
        "delete": "Excluir",
        "edit": "Editar",
        "search": "Buscar",
        "actions": "Ações",
        "confirm": "Confirmar",
        "success": "Sucesso",
        "error": "Erro",
        "warning": "Aviso",
        "info": "Informação",
        "status": "Status",
        "date": "Data",
        "total": "Total",
        "value": "Valor",
        "quantity": "Quantidade",
        "unit": "Unidade",
        "description": "Descrição",
        "observations": "Observações",
        "attachments": "Anexos",
        "history": "Histórico",
        "notifications": "Notificações",
        "profile": "Perfil",
        "settings": "Configurações",
        "logout": "Sair",
        "login": "Entrar",
        "back": "Voltar",
        "next": "Próximo",
        "finish": "Finalizar",
        "all": "Todos",
        "none": "Nenhum",
        "yes": "Sim",
        "no": "Não",
        "welcome": "Bem-vindo",
        "dashboard": "Dashboard",
        "procurement": "Compras",
        "suppliers": "Fornecedores",
        "products": "Produtos",
        "contracts": "Contratos",
        "reports": "Relatórios",
        "audit": "Auditoria",
        "security": "Segurança"
      },
      "dashboard": {
        "title": "Painel de Compras",
        "kpis": {
          "total_requests": "Total de Solicitações",
          "pending_approval": "Aguardando Cotação",
          "active_quotes": "Cotações Ativas",
          "completed_orders": "Pedidos Concluídos",
          "total_spend": "Volume do Mês",
          "saving": "Economia Gerada",
          "sla": "SLA de Atendimento",
          "subtitles": {
            "pending": "Solicitações pendentes",
            "volume": "Total faturado",
            "economy": "do volume total",
            "sla": "Nível de serviço"
          }
        }
      }
    }
  },
  en: {
    translation: {
      "common": {
        "loading": "Loading...",
        "save": "Save",
        "cancel": "Cancel",
        "delete": "Delete",
        "edit": "Edit",
        "search": "Search",
        "actions": "Actions",
        "confirm": "Confirm",
        "success": "Success",
        "error": "Error",
        "warning": "Warning",
        "info": "Info",
        "status": "Status",
        "date": "Date",
        "total": "Total",
        "value": "Value",
        "quantity": "Quantity",
        "unit": "Unit",
        "description": "Description",
        "observations": "Observations",
        "attachments": "Attachments",
        "history": "History",
        "notifications": "Notifications",
        "profile": "Profile",
        "settings": "Settings",
        "logout": "Logout",
        "login": "Login",
        "back": "Back",
        "next": "Next",
        "finish": "Finish",
        "all": "All",
        "none": "None",
        "yes": "Yes",
        "no": "No",
        "welcome": "Welcome",
        "dashboard": "Dashboard",
        "procurement": "Procurement",
        "suppliers": "Suppliers",
        "products": "Products",
        "contracts": "Contracts",
        "reports": "Reports",
        "audit": "Audit",
        "security": "Security"
      },
      "dashboard": {
        "title": "Procurement Dashboard",
        "kpis": {
          "total_requests": "Total Requests",
          "pending_approval": "Pending Approval",
          "active_quotes": "Active Quotes",
          "completed_orders": "Completed Orders",
          "total_spend": "Total Spend",
          "saving": "Total Saving"
        }
      }
    }
  },
  es: {
    translation: {
      "common": {
        "loading": "Cargando...",
        "save": "Guardar",
        "cancel": "Cancelar",
        "delete": "Eliminar",
        "edit": "Editar",
        "search": "Buscar",
        "actions": "Acciones",
        "confirm": "Confirmar",
        "success": "Éxito",
        "error": "Error",
        "warning": "Aviso",
        "info": "Información",
        "status": "Estado",
        "date": "Fecha",
        "total": "Total",
        "value": "Valor",
        "quantity": "Cantidad",
        "unit": "Unidad",
        "description": "Descripción",
        "observations": "Observaciones",
        "attachments": "Adjuntos",
        "history": "Historial",
        "notifications": "Notificaciones",
        "profile": "Perfil",
        "settings": "Configuraciones",
        "logout": "Salir",
        "login": "Entrar",
        "back": "Volver",
        "next": "Siguiente",
        "finish": "Finalizar",
        "all": "Todos",
        "none": "Ninguno",
        "yes": "Sí",
        "no": "No",
        "welcome": "Bienvenido",
        "dashboard": "Tablero",
        "procurement": "Compras",
        "suppliers": "Proveedores",
        "products": "Productos",
        "contracts": "Contratos",
        "reports": "Informes",
        "audit": "Auditoría",
        "security": "Seguridad"
      },
      "dashboard": {
        "title": "Tablero de Compras",
        "kpis": {
          "total_requests": "Total Solicitudes",
          "pending_approval": "Pendiente Aprobación",
          "active_quotes": "Cotizaciones Activas",
          "completed_orders": "Pedidos Completados",
          "total_spend": "Gasto Total",
          "saving": "Ahorro Total"
        }
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "pt",
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;