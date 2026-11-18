class MemoriaStorage implements Storage {
  private mapa = new Map<string, string>();

  get length(): number {
    return this.mapa.size;
  }

  clear(): void {
    this.mapa.clear();
  }

  getItem(key: string): string | null {
    return this.mapa.has(key) ? this.mapa.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.mapa.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.mapa.delete(key);
  }

  setItem(key: string, value: string): void {
    this.mapa.set(key, String(value));
  }
}

const storageInstancia = new MemoriaStorage();

Object.defineProperty(window, 'localStorage', {
  value: storageInstancia,
  configurable: true,
  writable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: storageInstancia,
  configurable: true,
  writable: true,
});
