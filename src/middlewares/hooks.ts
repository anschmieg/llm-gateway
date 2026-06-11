export { HooksManager, HookSpan } from './hooks/index';

// Export a middleware compatible handler
export async function hooks(c: any, next: any) {
  // Ensure hooksManager is present
  if (!c.get('hooksManager')) {
    c.set('hooksManager', new (await import('./hooks/index')).HooksManager());
  }
  return await next();
}
