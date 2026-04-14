import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Enums } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { NEXT_ACTION_LABELS, PARKING_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Phone, Check } from "lucide-react";
import { toast } from "sonner";

type Lead = Tables<"leads">;

interface MobileCallViewProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function MobileCallView({ lead, open, onOpenChange, onSaved }: MobileCallViewProps) {
  const { user } = useAuth();
  const [callNote, setCallNote] = useState("");
  const [nextActionType, setNextActionType] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline-editable fields
  const [sqm, setSqm] = useState(lead.square_meters != null ? String(lead.square_meters) : "");
  const [floorLevel, setFloorLevel] = useState(lead.floor_level != null ? String(lead.floor_level) : "");
  const [parkingStatus, setParkingStatus] = useState((lead as any).parking_status ?? "unknown");

  const canSave = nextActionType && nextActionDate;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    // 1. Create comm log
    await supabase.from("communication_logs").insert({
      lead_id: lead.id,
      type: "phone_call" as Enums<"comm_type">,
      direction: "outbound" as Enums<"comm_direction">,
      summary: callNote.trim() || "Udgående opkald",
      created_by: user?.id,
    });

    // 2. Update lead fields
    const updates: Record<string, any> = {
      last_contacted_at: new Date().toISOString(),
      next_followup_at: new Date(nextActionDate).toISOString(),
      next_action_type: nextActionType,
    };

    // Auto-transition new → contacted
    if (lead.status === "new") {
      updates.status = "contacted";
    }

    // Save inline-edited fields
    if (sqm) updates.square_meters = Number(sqm);
    if (floorLevel) updates.floor_level = Number(floorLevel);
    if (parkingStatus !== "unknown") updates.parking_status = parkingStatus;

    await supabase.from("leads").update(updates).eq("id", lead.id);

    setSaving(false);
    setCallNote("");
    setNextActionType("");
    setNextActionDate("");
    toast.success("Opkald gemt med næste handling");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Ring til {lead.name}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4 overflow-y-auto">
          {/* Click-to-Call */}
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center justify-center gap-3 w-full rounded-xl bg-primary text-primary-foreground py-4 text-lg font-semibold active:scale-95 transition-transform"
            >
              <Phone className="h-6 w-6" />
              {lead.phone}
            </a>
          )}

          {/* Quick info edit */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">m²</Label>
              <Input
                type="number"
                value={sqm}
                onChange={(e) => setSqm(e.target.value)}
                placeholder="—"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Etage</Label>
              <Input
                type="number"
                value={floorLevel}
                onChange={(e) => setFloorLevel(e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Parkering</Label>
              <Select value={parkingStatus} onValueChange={setParkingStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PARKING_STATUS_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Call Notes */}
          <div>
            <Label className="text-xs">Opkaldsnoter</Label>
            <Textarea
              value={callNote}
              onChange={(e) => setCallNote(e.target.value)}
              placeholder="Hvad blev aftalt..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Forced Next Action */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
            <p className="text-xs font-semibold text-primary">Næste handling (påkrævet)</p>
            <Select value={nextActionType} onValueChange={setNextActionType}>
              <SelectTrigger>
                <SelectValue placeholder="Vælg handling..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(NEXT_ACTION_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <Label className="text-xs">Dato</Label>
              <Input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <DrawerFooter>
          <Button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full gap-2"
          >
            <Check className="h-4 w-4" />
            {saving ? "Gemmer..." : "Gem opkald & næste handling"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Annuller</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
