import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { logger } from "@/lib/logger";
import { motion } from "framer-motion";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";
import { EliteButton } from "@/components/atoms/EliteButton";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.warn("404 Error: User attempted to access non-existent route", { pathname: location.pathname });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-white p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full text-center relative z-10"
      >
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] border border-white/10 flex items-center justify-center text-primary shadow-2xl backdrop-blur-2xl">
            <AlertTriangle className="w-12 h-12" />
          </div>
        </div>

        <h1 className="text-8xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/20">
          404
        </h1>
        
        <h2 className="text-2xl font-bold mb-4 tracking-tight uppercase">
          Módulo não localizado
        </h2>
        
        <p className="text-zinc-500 mb-10 font-medium leading-relaxed">
          A rota <code className="bg-white/5 px-2 py-1 rounded text-primary text-sm">{location.pathname}</code> não existe ou foi movida para outro setor da plataforma.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/" className="w-full sm:w-auto">
            <EliteButton className="w-full h-14 px-8 rounded-2xl bg-white text-black hover:bg-zinc-200 transition-all font-black uppercase text-xs tracking-widest gap-2">
              <Home className="w-4 h-4" />
              Início do Sistema
            </EliteButton>
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto flex items-center justify-center h-14 px-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-black uppercase text-xs tracking-widest gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
