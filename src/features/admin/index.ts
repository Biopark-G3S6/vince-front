export { AdminShell } from './components/AdminShell';
export { PageScaffold } from './components/PageScaffold';
export { ShellSlotsProvider } from './components/ShellSlots';
export {
  demoUsers,
  hasPermission,
  IDENTITY_KEY,
  makeInitials,
  useAuthenticatedUser,
  useCurrentUser,
  useIdentity,
  useSignOut,
  type DemoUser,
  type Role,
  type SessionUser,
} from './model/persona';
export { canAccessSection, sectionsForRole, type AdminSection } from './model/accessPolicy';
export { PersonaSwitch } from './components/PersonaSwitch';
