// See https://kit.svelte.dev/docs/types#app

declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        role: 'admin' | 'manager' | 'driver';
        email?: string;
      } | null;
    }
  }
}

export {};
