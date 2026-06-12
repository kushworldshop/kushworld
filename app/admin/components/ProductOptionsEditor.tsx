'use client';

import type { ProductOptionGroup } from '@/lib/productOptions';
import {
  parseOptionGroupValuesText,
  serializeOptionGroupValues,
} from '@/lib/productOptions';

interface ProductOptionsEditorProps {
  value: ProductOptionGroup[];
  onChange: (groups: ProductOptionGroup[]) => void;
}

function emptyGroup(): ProductOptionGroup {
  return { name: '', values: [] };
}

export default function ProductOptionsEditor({ value, onChange }: ProductOptionsEditorProps) {
  const groups = value.length > 0 ? value : [];

  const updateGroup = (index: number, next: ProductOptionGroup) => {
    const updated = [...groups];
    updated[index] = next;
    onChange(updated.filter((group) => group.name.trim() || group.values.length > 0));
  };

  const removeGroup = (index: number) => {
    onChange(groups.filter((_, i) => i !== index));
  };

  const addGroup = () => {
    onChange([...groups, emptyGroup()]);
  };

  return (
    <div className="md:col-span-2 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Product options</p>
          <p className="text-xs text-zinc-500">
            Add option groups like Size, Color, Strain, or Flavor. One value per line. Use{' '}
            <span className="text-zinc-300">XL (+$5)</span> for price adjustments.
          </p>
        </div>
        <button
          type="button"
          onClick={addGroup}
          className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-sm font-medium"
        >
          + Add option group
        </button>
      </div>

      {groups.length === 0 && (
        <p className="text-xs text-zinc-500 border border-dashed border-zinc-700 rounded-xl p-4">
          No custom options yet. Existing size/color data from the catalog still works until you add
          option groups here.
        </p>
      )}

      {groups.map((group, index) => (
        <div key={index} className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <input
              value={group.name}
              onChange={(e) => updateGroup(index, { ...group, name: e.target.value })}
              placeholder="Option name (e.g. Size, Strain, Color)"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3"
            />
            <button
              type="button"
              onClick={() => removeGroup(index)}
              className="text-red-400 hover:text-red-300 text-sm px-3 py-2"
            >
              Remove
            </button>
          </div>
          <textarea
            value={serializeOptionGroupValues(group.values)}
            onChange={(e) =>
              updateGroup(index, {
                ...group,
                values: parseOptionGroupValuesText(e.target.value),
              })
            }
            rows={4}
            placeholder={'S\nM\nL\nXL (+$5)'}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 font-mono text-sm"
          />
        </div>
      ))}
    </div>
  );
}