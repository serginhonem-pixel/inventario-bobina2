import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast, subscribeToasts } from '../toast';

describe('toast', () => {
  let listener;
  let unsubscribe;

  beforeEach(() => {
    listener = vi.fn();
    unsubscribe = subscribeToasts(listener);
  });

  afterEach(() => {
    if (unsubscribe) unsubscribe();
  });

  it('envia toast com mensagem string', () => {
    toast('Hello');
    expect(listener).toHaveBeenCalledTimes(1);
    const payload = listener.mock.calls[0][0];
    expect(payload.message).toBe('Hello');
    expect(payload.type).toBe('info');
    expect(payload.duration).toBe(4000);
    expect(payload.id).toBeTruthy();
  });

  it('permite customizar type', () => {
    toast('Erro!', { type: 'error' });
    expect(listener.mock.calls[0][0].type).toBe('error');
  });

  it('permite customizar duration', () => {
    toast('Rápido', { duration: 1000 });
    expect(listener.mock.calls[0][0].duration).toBe(1000);
  });

  it('aceita objeto como primeiro argumento', () => {
    toast({ message: 'Objeto', type: 'success', duration: 2000 });
    const payload = listener.mock.calls[0][0];
    expect(payload.message).toBe('Objeto');
    expect(payload.type).toBe('success');
    expect(payload.duration).toBe(2000);
  });

  it('gera IDs únicos para cada toast', () => {
    toast('A');
    toast('B');
    const id1 = listener.mock.calls[0][0].id;
    const id2 = listener.mock.calls[1][0].id;
    expect(id1).not.toBe(id2);
  });

  it('retorna o ID do toast', () => {
    const id = toast('Test');
    expect(typeof id).toBe('string');
    expect(id).toBeTruthy();
  });

  it('permite ID customizado', () => {
    toast('Custom', { id: 'my-id' });
    expect(listener.mock.calls[0][0].id).toBe('my-id');
  });
});

describe('subscribeToasts', () => {
  it('permite múltiplos listeners', () => {
    const l1 = vi.fn();
    const l2 = vi.fn();
    const u1 = subscribeToasts(l1);
    const u2 = subscribeToasts(l2);

    toast('Both');
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);

    u1();
    u2();
  });

  it('unsubscribe remove o listener', () => {
    const l = vi.fn();
    const u = subscribeToasts(l);
    u();

    toast('After unsub');
    expect(l).not.toHaveBeenCalled();
  });

  it('unsubscribe duplo não quebra', () => {
    const l = vi.fn();
    const u = subscribeToasts(l);
    u();
    u(); // segunda chamada não deve dar erro
    expect(l).not.toHaveBeenCalled();
  });
});
