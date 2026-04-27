import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('uses primary intent and md size by default', () => {
    render(<Button>Go</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-brand-500');
    expect(btn.className).toContain('text-base');
  });

  it.each([
    ['primary',   'bg-brand-500'],
    ['secondary', 'bg-neutral-100'],
    ['ghost',     'bg-transparent'],
    ['danger',    'bg-error-500'],
  ] as const)('intent="%s" applies expected bg class', (intent, cls) => {
    render(<Button intent={intent}>X</Button>);
    expect(screen.getByRole('button').className).toContain(cls);
  });

  it.each([
    ['sm', 'text-sm'],
    ['md', 'text-base'],
    ['lg', 'text-lg'],
  ] as const)('size="%s" applies expected text-size class', (size, cls) => {
    render(<Button size={size}>X</Button>);
    expect(screen.getByRole('button').className).toContain(cls);
  });

  it('fires onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('sets the disabled attribute when disabled prop is passed', () => {
    render(<Button disabled>X</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('forwards ref to the underlying button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>X</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('appends className without dropping base variant classes', () => {
    render(<Button className="extra-class">X</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('extra-class');
    expect(btn.className).toContain('bg-brand-500');
  });

  it('forwards arbitrary HTML button attributes', () => {
    render(<Button type="submit" aria-label="submit form">X</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('type', 'submit');
    expect(btn).toHaveAttribute('aria-label', 'submit form');
  });
});
