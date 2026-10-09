import type { Person } from '@/lib/rights';
import type { DemoUnit } from '@/services/demoStore';
import { UNIT_META } from '@/services/verity';
export function scopedLibrary(units: DemoUnit[], person: Person) {
  if (!person.capabilities.includes('get_unit')) return [];
  return units.filter(unit => {
    const kb = UNIT_META[unit.unit_id]?.kb;
    return !!kb && person.kbs.includes(kb);
  });
}
