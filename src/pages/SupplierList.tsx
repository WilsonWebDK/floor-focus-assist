import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Phone, Mail, MapPin } from "lucide-react";

type Supplier = Tables<"suppliers">;

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("suppliers").select("*").order("name").then(({ data }) => {
      setSuppliers(data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Leverandører</h1>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : suppliers.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Ingen leverandører tilføjet endnu</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <div key={s.id} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  {s.skills && s.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.skills.map((skill) => (
                        <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {s.quality_score != null && (
                  <span className="text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">
                    {s.quality_score}/10
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {s.phone && (
                  <a href={`tel:${s.phone}`} className="flex items-center gap-1 hover:text-foreground">
                    <Phone className="h-3 w-3" /> {s.phone}
                  </a>
                )}
                {s.email && (
                  <a href={`mailto:${s.email}`} className="flex items-center gap-1 hover:text-foreground">
                    <Mail className="h-3 w-3" /> {s.email}
                  </a>
                )}
                {s.cities_served && s.cities_served.length > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {s.cities_served.join(", ")}
                  </span>
                )}
              </div>
              {s.price_level && (
                <p className="text-xs text-muted-foreground">Prisniveau: {s.price_level}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
