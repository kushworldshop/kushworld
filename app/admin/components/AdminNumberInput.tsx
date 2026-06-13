'use client';

import { useEffect, useState } from 'react';

interface AdminNumberInputBaseProps {
  placeholder?: string;
  className?: string;
  /** Show blank instead of 0 when not focused */
  emptyWhenZero?: boolean;
  integer?: boolean;
}

interface AdminNumberInputProps extends AdminNumberInputBaseProps {
  value: number;
  onChange: (value: number) => void;
  optional?: false;
}

interface AdminOptionalNumberInputProps extends AdminNumberInputBaseProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  optional: true;
}

type Props = AdminNumberInputProps | AdminOptionalNumberInputProps;

const DECIMAL_PATTERN = /^\d*\.?\d*$/;
const INTEGER_PATTERN = /^\d*$/;

function formatDisplay(value: number | undefined, emptyWhenZero: boolean, integer: boolean): string {
  if (value === undefined || (emptyWhenZero && value === 0)) return '';
  if (integer) return String(Math.trunc(value));
  return String(value);
}

function parseValue(raw: string, integer: boolean): number | undefined {
  if (raw === '' || raw === '.') return undefined;
  const parsed = integer ? parseInt(raw, 10) : parseFloat(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export default function AdminNumberInput(props: Props) {
  const {
    placeholder = '0',
    className = '',
    emptyWhenZero = true,
    integer = false,
  } = props;

  const optional = props.optional === true;
  const value = props.value;
  const onChange = props.onChange;

  const [text, setText] = useState(() => formatDisplay(value, emptyWhenZero, integer));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatDisplay(value, emptyWhenZero, integer));
    }
  }, [value, focused, emptyWhenZero, integer]);

  const pattern = integer ? INTEGER_PATTERN : DECIMAL_PATTERN;

  const commit = (raw: string) => {
    const parsed = parseValue(raw, integer);
    if (optional) {
      (onChange as (v: number | undefined) => void)(parsed);
      return;
    }
    (onChange as (v: number) => void)(parsed ?? 0);
  };

  const handleChange = (raw: string) => {
    if (raw !== '' && !pattern.test(raw)) return;
    setText(raw);
    if (raw === '' || raw === '.') {
      if (optional) {
        (onChange as (v: number | undefined) => void)(undefined);
      } else {
        (onChange as (v: number) => void)(0);
      }
      return;
    }
    const parsed = parseValue(raw, integer);
    if (parsed !== undefined) commit(raw);
  };

  const handleBlur = () => {
    setFocused(false);
    if (text === '' || text === '.') {
      if (optional) {
        (onChange as (v: number | undefined) => void)(undefined);
        setText('');
      } else {
        (onChange as (v: number) => void)(0);
        setText(emptyWhenZero ? '' : '0');
      }
      return;
    }

    const parsed = parseValue(text, integer);
    if (optional) {
      (onChange as (v: number | undefined) => void)(parsed);
      setText(formatDisplay(parsed, emptyWhenZero, integer));
    } else {
      const final = parsed ?? 0;
      (onChange as (v: number) => void)(final);
      setText(formatDisplay(final, emptyWhenZero, integer));
    }
  };

  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      value={text}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      className={className}
    />
  );
}