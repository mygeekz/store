import React, {useEffect, useMemo, useRef, useState} from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  allowNew?: boolean;
  disabled?: boolean;
};

type PhoneModel = { brand: 'Apple'|'Samsung'|'Xiaomi'|'Other'; model: string };

// دیتای اولیه (می‌توانید بعداً بیشترش کنید)
const INITIAL_MODELS: PhoneModel[] = [
  // ——— Apple ———
  { brand: 'Apple', model: 'iPhone 3G' },
  { brand: 'Apple', model: 'iPhone 3G S' },
  { brand: 'Apple', model: 'iPhone 4' },
  { brand: 'Apple', model: 'iPhone 4 S' },
  { brand: 'Apple', model: 'iPhone 5' },
  { brand: 'Apple', model: 'iPhone 5 S' },
  { brand: 'Apple', model: 'iPhone 6' },
  { brand: 'Apple', model: 'iPhone 6 S' },
  { brand: 'Apple', model: 'iPhone 7' },
  { brand: 'Apple', model: 'iPhone 7 Plus' },
  { brand: 'Apple', model: 'iPhone SE 2016' },
  { brand: 'Apple', model: 'iPhone SE 2020' },
  { brand: 'Apple', model: 'iPhone SE 2022' },
  { brand: 'Apple', model: 'iPhone 8' },
  { brand: 'Apple', model: 'iPhone 8 Plus' },
  { brand: 'Apple', model: 'iPhone X' },
  { brand: 'Apple', model: 'iPhone XR' },
  { brand: 'Apple', model: 'iPhone XS' },
  { brand: 'Apple', model: 'iPhone XS Max' },
  { brand: 'Apple', model: 'iPhone SE (2020)' },
  { brand: 'Apple', model: 'iPhone 11' },
  { brand: 'Apple', model: 'iPhone 11 Pro' },
  { brand: 'Apple', model: 'iPhone 11 Pro Max' },
  { brand: 'Apple', model: 'iPhone 12 mini' },
  { brand: 'Apple', model: 'iPhone 12' },
  { brand: 'Apple', model: 'iPhone 12 Pro' },
  { brand: 'Apple', model: 'iPhone 12 Pro Max' },
  { brand: 'Apple', model: 'iPhone 13 mini' },
  { brand: 'Apple', model: 'iPhone 13' },
  { brand: 'Apple', model: 'iPhone 13 Pro' },
  { brand: 'Apple', model: 'iPhone 13 Pro Max' },
  { brand: 'Apple', model: 'iPhone SE (2022)' },
  { brand: 'Apple', model: 'iPhone 14' },
  { brand: 'Apple', model: 'iPhone 14 Plus' },
  { brand: 'Apple', model: 'iPhone 14 Pro' },
  { brand: 'Apple', model: 'iPhone 14 Pro Max' },
  { brand: 'Apple', model: 'iPhone 15' },
  { brand: 'Apple', model: 'iPhone 15 Plus' },
  { brand: 'Apple', model: 'iPhone 15 Pro' },
  { brand: 'Apple', model: 'iPhone 15 Pro Max' },
  { brand: 'Apple', model: 'iPhone 16' },
  { brand: 'Apple', model: 'iPhone 16 Plus' },
  { brand: 'Apple', model: 'iPhone 16 Pro' },
  { brand: 'Apple', model: 'iPhone 16 Pro Max' },

  // ——— Samsung (S / Note / Z) ———
  { brand: 'Samsung', model: 'Galaxy S10e' },
  { brand: 'Samsung', model: 'Galaxy S10' },
  { brand: 'Samsung', model: 'Galaxy S10+' },
  { brand: 'Samsung', model: 'Galaxy S10 5G' },
  { brand: 'Samsung', model: 'Galaxy Note10' },
  { brand: 'Samsung', model: 'Galaxy Note10+' },
  { brand: 'Samsung', model: 'Galaxy Note20' },
  { brand: 'Samsung', model: 'Galaxy Note20 Ultra' },
  { brand: 'Samsung', model: 'Galaxy S20' },
  { brand: 'Samsung', model: 'Galaxy S20+' },
  { brand: 'Samsung', model: 'Galaxy S20 Ultra' },
  { brand: 'Samsung', model: 'Galaxy S21' },
  { brand: 'Samsung', model: 'Galaxy S21+' },
  { brand: 'Samsung', model: 'Galaxy S21 Ultra' },
  { brand: 'Samsung', model: 'Galaxy S21 FE' },
  { brand: 'Samsung', model: 'Galaxy S22' },
  { brand: 'Samsung', model: 'Galaxy S22+' },
  { brand: 'Samsung', model: 'Galaxy S22 Ultra' },
  { brand: 'Samsung', model: 'Galaxy S23' },
  { brand: 'Samsung', model: 'Galaxy S23+' },
  { brand: 'Samsung', model: 'Galaxy S23 Ultra' },
  { brand: 'Samsung', model: 'Galaxy S23 FE' },
  { brand: 'Samsung', model: 'Galaxy S24' },
  { brand: 'Samsung', model: 'Galaxy S24+' },
  { brand: 'Samsung', model: 'Galaxy S24 Ultra' },
  { brand: 'Samsung', model: 'Galaxy S25' },
  { brand: 'Samsung', model: 'Galaxy S25+' },
  { brand: 'Samsung', model: 'Galaxy S25 Ultra' },
  { brand: 'Samsung', model: 'Galaxy Z Fold2' },
  { brand: 'Samsung', model: 'Galaxy Z Fold3' },
  { brand: 'Samsung', model: 'Galaxy Z Fold4' },
  { brand: 'Samsung', model: 'Galaxy Z Fold5' },
  { brand: 'Samsung', model: 'Galaxy Z Fold6' },
  { brand: 'Samsung', model: 'Galaxy Z Flip' },
  { brand: 'Samsung', model: 'Galaxy Z Flip3' },
  { brand: 'Samsung', model: 'Galaxy Z Flip4' },
  { brand: 'Samsung', model: 'Galaxy Z Flip5' },
  { brand: 'Samsung', model: 'Galaxy Z Flip6' },

  // ——— Samsung (A / M) ———
  { brand: 'Samsung', model: 'Galaxy A71' },
  { brand: 'Samsung', model: 'Galaxy A72' },
  { brand: 'Samsung', model: 'Galaxy A73' },
  { brand: 'Samsung', model: 'Galaxy A50' },
  { brand: 'Samsung', model: 'Galaxy A50S' },
  { brand: 'Samsung', model: 'Galaxy A51' },
  { brand: 'Samsung', model: 'Galaxy A52' },
  { brand: 'Samsung', model: 'Galaxy A52s' },
  { brand: 'Samsung', model: 'Galaxy A53' },
  { brand: 'Samsung', model: 'Galaxy A54' },
  { brand: 'Samsung', model: 'Galaxy A55' },
  { brand: 'Samsung', model: 'Galaxy A56' },
  { brand: 'Samsung', model: 'Galaxy A33' },
  { brand: 'Samsung', model: 'Galaxy A34' },
  { brand: 'Samsung', model: 'Galaxy A35' },
  { brand: 'Samsung', model: 'Galaxy A36' },
  { brand: 'Samsung', model: 'Galaxy A24' },
  { brand: 'Samsung', model: 'Galaxy A25' },
  { brand: 'Samsung', model: 'Galaxy A26' },
  { brand: 'Samsung', model: 'Galaxy A14' },
  { brand: 'Samsung', model: 'Galaxy A15' },
  { brand: 'Samsung', model: 'Galaxy A16' },
  { brand: 'Samsung', model: 'Galaxy M31' },
  { brand: 'Samsung', model: 'Galaxy M32' },
  { brand: 'Samsung', model: 'Galaxy M33' },
  { brand: 'Samsung', model: 'Galaxy M34' },
  { brand: 'Samsung', model: 'Galaxy M54' },

  // ——— Xiaomi flagships ———
  { brand: 'Xiaomi', model: 'Mi 10' },
  { brand: 'Xiaomi', model: 'Mi 10T' },
  { brand: 'Xiaomi', model: 'Mi 10T Pro' },
  { brand: 'Xiaomi', model: 'Mi 11' },
  { brand: 'Xiaomi', model: 'Mi 11 Ultra' },
  { brand: 'Xiaomi', model: 'Mi 11i' },
  { brand: 'Xiaomi', model: 'Xiaomi 12' },
  { brand: 'Xiaomi', model: 'Xiaomi 12X' },
  { brand: 'Xiaomi', model: 'Xiaomi 12 Pro' },
  { brand: 'Xiaomi', model: 'Xiaomi 12T' },
  { brand: 'Xiaomi', model: 'Xiaomi 12T Pro' },
  { brand: 'Xiaomi', model: 'Xiaomi 13' },
  { brand: 'Xiaomi', model: 'Xiaomi 13 Pro' },
  { brand: 'Xiaomi', model: 'Xiaomi 13 Ultra' },
  { brand: 'Xiaomi', model: 'Xiaomi 13T' },
  { brand: 'Xiaomi', model: 'Xiaomi 13T Pro' },
  { brand: 'Xiaomi', model: 'Xiaomi 14' },
  { brand: 'Xiaomi', model: 'Xiaomi 14 Pro' },
  { brand: 'Xiaomi', model: 'Xiaomi 14 Ultra' },
  { brand: 'Xiaomi', model: 'Xiaomi 15' },
  { brand: 'Xiaomi', model: 'Xiaomi 15 Pro' },

  // ——— Redmi Note ———
  { brand: 'Xiaomi', model: 'Redmi Note 8' },
  { brand: 'Xiaomi', model: 'Redmi Note 8 Pro' },
  { brand: 'Xiaomi', model: 'Redmi Note 9' },
  { brand: 'Xiaomi', model: 'Redmi Note 9S' },
  { brand: 'Xiaomi', model: 'Redmi Note 9 Pro' },
  { brand: 'Xiaomi', model: 'Redmi Note 10' },
  { brand: 'Xiaomi', model: 'Redmi Note 10S' },
  { brand: 'Xiaomi', model: 'Redmi Note 10 Pro' },
  { brand: 'Xiaomi', model: 'Redmi Note 11' },
  { brand: 'Xiaomi', model: 'Redmi Note 11S' },
  { brand: 'Xiaomi', model: 'Redmi Note 11 Pro' },
  { brand: 'Xiaomi', model: 'Redmi Note 12' },
  { brand: 'Xiaomi', model: 'Redmi Note 12 Pro' },
  { brand: 'Xiaomi', model: 'Redmi Note 12 Pro+' },
  { brand: 'Xiaomi', model: 'Redmi Note 13' },
  { brand: 'Xiaomi', model: 'Redmi Note 13X' },
  { brand: 'Xiaomi', model: 'Redmi Note 13 5G' },
  { brand: 'Xiaomi', model: 'Redmi Note 13 Pro' },
  { brand: 'Xiaomi', model: 'Redmi Note 13 Pro+' },
  { brand: 'Xiaomi', model: 'Redmi Note 14' },
  { brand: 'Xiaomi', model: 'Redmi Note 14 Pro' },
  { brand: 'Xiaomi', model: 'Redmi Note 14 Pro+' },

  // ——— POCO ———
  { brand: 'Xiaomi', model: 'POCO F2 Pro' },
  { brand: 'Xiaomi', model: 'POCO F3' },
  { brand: 'Xiaomi', model: 'POCO F4' },
  { brand: 'Xiaomi', model: 'POCO F4 GT' },
  { brand: 'Xiaomi', model: 'POCO F5' },
  { brand: 'Xiaomi', model: 'POCO F5 Pro' },
  { brand: 'Xiaomi', model: 'POCO F6' },
  { brand: 'Xiaomi', model: 'POCO F6 Pro' },
  { brand: 'Xiaomi', model: 'POCO F7' },
  { brand: 'Xiaomi', model: 'POCO X3 NFC' },
  { brand: 'Xiaomi', model: 'POCO X3 Pro' },
  { brand: 'Xiaomi', model: 'POCO X4 Pro' },
  { brand: 'Xiaomi', model: 'POCO X5' },
  { brand: 'Xiaomi', model: 'POCO X5 Pro' },
  { brand: 'Xiaomi', model: 'POCO X6' },
  { brand: 'Xiaomi', model: 'POCO X6 Pro' },
  { brand: 'Xiaomi', model: 'POCO X7 Pro' },
  { brand: 'Xiaomi', model: 'POCO M4 Pro' },
  { brand: 'Xiaomi', model: 'POCO M5' },
  { brand: 'Xiaomi', model: 'POCO M6 Pro' },
];


function normalize(s: string) {
  return (s || '')
    .toLowerCase()
    .replaceAll('آ','ا')
    .replaceAll('ي','ی')
    .replaceAll('ك','ک')
    .trim();
}

const PhoneModelAutocomplete: React.FC<Props> = ({
  value,
  onChange,
  placeholder = 'مثال: iPhone 15 Pro',
  allowNew = true,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [cursor, setCursor] = useState(0);
  const [models, setModels] = useState<PhoneModel[]>(INITIAL_MODELS);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setQuery(value || ''), [value]);

  // بسته‌شدن با کلیک بیرون
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const items = useMemo(() => {
    const q = normalize(query);
    if (!q) return models.slice(0, 15);
    return models.filter(m => normalize(`${m.brand} ${m.model}`).includes(q)).slice(0, 15);
  }, [query, models]);

  const exactExists = useMemo(() => {
    const q = normalize(query);
    return models.some(m => normalize(m.model) === q);
  }, [query, models]);

  const select = (m: PhoneModel) => {
    onChange(m.model);
    setQuery(m.model);
    setOpen(false);
  };

  const addNew = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const newItem: PhoneModel = { brand: 'Other', model: trimmed };
    setModels(prev => [newItem, ...prev]);
    select(newItem);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = e => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, items.length - 1 + (allowNew && query && !exactExists ? 1 : 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const canAdd = allowNew && query && !exactExists;
      if (cursor < items.length) select(items[cursor]);
      else if (canAdd && cursor === items.length) addNew();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        disabled={disabled}
        onChange={e => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
          setCursor(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
        dir="ltr"
      />

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          {items.map((m, i) => (
            <button
              key={`${m.brand}-${m.model}-${i}`}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => select(m)}
              className={`w-full text-right px-3 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 ${
                i === cursor ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <span className="text-gray-800 dark:text-gray-200">{m.model}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{m.brand}</span>
            </button>
          ))}

          {allowNew && query && !exactExists && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={addNew}
              className={`w-full text-right px-3 py-2 border-t dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 ${
                cursor === items.length ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''
              }`}
            >
              افزودن «{query}» به لیست
            </button>
          )}

          {!items.length && !(allowNew && query && !exactExists) && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">مدلی یافت نشد.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhoneModelAutocomplete;
